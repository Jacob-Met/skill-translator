import {originalPhotoCorners,PHOTO_CORNERS_LIMITS} from '../src/photo-corners.mjs';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
const names=['Top left','Top right','Bottom right','Bottom left'];
export function installPhotoCorners({target,readDraft,propose,redraw}) {
  let worker=null,version=0,report=null,source=null,selected=null,rotation=0;
  let editing=null,active=0,zoom=1,dragging=false,viewCenter=null;
  const dialog=$('photoCornerInspector'),detail=$('photoOutlineDetail');
  const status=text=>$('photoCornersStatus').textContent=text;
  function clearPreview(){$('usePhotoCorners').disabled=true;$('rotatePhotoCorners').disabled=true;report=null;source=null;selected=null;rotation=0;$('photoCornerChoices').replaceChildren();}
  function closeInspector(){if(dialog.open)dialog.close();editing=null;dragging=false;}
  function invalidate({clear=false}={}){
    version++;worker?.terminate();worker=null;$('findPhotoCorners').disabled=!target();
    if(clear){closeInspector();clearPreview();status('Find an outline or inspect and place the corners yourself.');$('photoCornersAnalysis').textContent='';redraw();}
  }
  function points(){if(!selected||source!==target())return null;return originalPhotoCorners(selected,report.width,report.height,source.image.widthPx,source.image.heightPx,rotation);}
  function svgNode(tag,attrs={},text=''){const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);n.textContent=text;detail.append(n);return n;}
  function drawInspector(){
    if(!editing||editing.source!==target())return;
    const {widthPx:w,heightPx:h}=editing.source.image,center=viewCenter||editing.corners[active]||{x:w/2,y:h/2},vw=w/zoom,vh=h/zoom;
    const left=Math.max(0,Math.min(w-vw,center.x-vw/2)),top=Math.max(0,Math.min(h-vh,center.y-vh/2));
    detail.setAttribute('viewBox',left+' '+top+' '+vw+' '+vh);detail.replaceChildren();
    svgNode('image',{href:editing.source.url,x:0,y:0,width:w,height:h});
    const box=detail.getBoundingClientRect(),scale=Math.max(vw/Math.max(1,box.width),vh/Math.max(1,box.height));
    if(editing.corners.every(Boolean))svgNode('polygon',{points:editing.corners.map(p=>p.x+','+p.y).join(' '),fill:'#63e4d815',stroke:'#79dece','stroke-width':2*scale});
    editing.corners.forEach((p,i)=>{if(!p)return;svgNode('circle',{cx:p.x,cy:p.y,r:(i===active?15:11)*scale,fill:i===active?'#dbfff8':'#102928',stroke:'#79dece','stroke-width':2*scale});svgNode('text',{x:p.x,y:p.y,'text-anchor':'middle','dominant-baseline':'central','font-size':13*scale,fill:i===active?'#102928':'#d9fff8'},String(i+1));});
    $('photoCornerActive').value=String(active);const p=editing.corners[active];
    for(const axis of ['x','y'])if(document.activeElement!==$('photoCornerEdit'+axis.toUpperCase()))$('photoCornerEdit'+axis.toUpperCase()).value=p?String(Math.round(p[axis]*100)/100):'';
    $('photoCornerZoom').textContent=zoom+'×';$('photoCornerZoom').setAttribute('aria-label','Magnification '+zoom+' times; increase');
    $('usePhotoCorners').disabled=!editing.corners.every(Boolean);
    $('rotatePhotoCorners').disabled=!editing.corners.every(Boolean);
    $('photoCornerDimensions').textContent=$('captureWidth').value+' × '+$('captureHeight').value+' mm entered · measure this same boundary';
    $('photoCornerEditStatus').textContent='Corner '+(active+1)+' · '+names[active]+'. Drag or tap its position; arrow keys move 1 px.';
  }
  function openInspector(){
    const current=target();if(!current)return;
    const p=points(),draft=readDraft();
    editing={source:current,corners:structuredClone(p||draft.corners),evidence:p?{
      format:report.version,image:structuredClone(current.image),
      analysis:{width:report.width,height:report.height,kernel:report.kernel,settings:structuredClone(selected.settings)},
      selectedOutline:structuredClone(selected),rotation,proposedCorners:structuredClone(p),
      limits:'Intensity-region outline proposal, reviewed by the author. Sampling, shadows, occlusion and texture can shift corners or omit a workpiece. The image does not identify the intended workpiece, dimensions, uncertainty or physical accuracy.'
    }:structuredClone(draft.evidence),proposal:Boolean(p)};
    active=0;zoom=1;viewCenter=null;dialog.showModal();drawInspector();detail.focus();
  }
  $('inspectPhotoCorners').onclick=openInspector;
  $('closePhotoCornerInspector').onclick=()=>{closeInspector();redraw();};
  dialog.addEventListener('cancel',()=>{editing=null;dragging=false;});
  $('photoCornerActive').onchange=()=>{active=Number($('photoCornerActive').value);viewCenter=editing?.corners[active];drawInspector();};
  $('photoCornerZoom').onclick=()=>{zoom=zoom===1?2:zoom===2?4:1;viewCenter=editing?.corners[active];drawInspector();};
  $('photoCornerFit').onclick=()=>{zoom=1;viewCenter=null;drawInspector();};
  function movePoint(x,y){if(!editing)return;const {widthPx:w,heightPx:h}=editing.source.image;if(!Number.isFinite(x)||!Number.isFinite(y))return;editing.corners[active]={x:Math.max(0,Math.min(w-1,x)),y:Math.max(0,Math.min(h-1,y))};drawInspector();}
  for(const axis of ['X','Y'])$('photoCornerEdit'+axis).addEventListener('input',()=>{const x=$('photoCornerEditX').value,y=$('photoCornerEditY').value;if(!editing)return;const {widthPx:w,heightPx:h}=editing.source.image;if(x.trim()&&y.trim()&&Number(x)>=0&&Number(y)>=0&&Number(x)<w&&Number(y)<h)movePoint(Number(x),Number(y));else{editing.corners[active]=null;drawInspector();}});
  function local(event){const p=detail.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(detail.getScreenCTM().inverse());}
  detail.addEventListener('pointerdown',event=>{
    if(!editing||event.button!==0)return;event.preventDefault();detail.focus();const p=local(event),box=detail.getBoundingClientRect(),vb=detail.viewBox.baseVal,slop=24*Math.max(vb.width/box.width,vb.height/box.height);
    const near=editing.corners.map((q,i)=>({i,d:q?Math.hypot(q.x-p.x,q.y-p.y):Infinity})).sort((a,b)=>a.d-b.d)[0];
    if(near.d<=slop){active=near.i;}else movePoint(p.x,p.y);
    dragging=true;detail.setPointerCapture(event.pointerId);drawInspector();
  });
  detail.addEventListener('pointermove',event=>{if(dragging&&editing){const p=local(event);movePoint(p.x,p.y);}});
  for(const name of ['pointerup','pointercancel'])detail.addEventListener(name,()=>{dragging=false;});
  function nudge(dx,dy){const p=editing?.corners[active];if(p)movePoint(p.x+dx,p.y+dy);}
  detail.addEventListener('keydown',event=>{const step=event.shiftKey?10:1,dir={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key];if(dir){event.preventDefault();nudge(...dir);}});
  for(const button of document.querySelectorAll('[data-corner-nudge]'))button.onclick=()=>nudge(...button.dataset.cornerNudge.split(',').map(Number));
  window.addEventListener('resize',drawInspector);
  $('findPhotoCorners').onclick=async()=>{
    invalidate();clearPreview();redraw();const token=version,current=target();if(!current)return;
    $('findPhotoCorners').disabled=true;status('Finding four-sided outlines…');
    try{
      const image=new Image();image.src=current.url;await image.decode();if(token!==version||current!==target())return;
      const factor=Math.min(1,PHOTO_CORNERS_LIMITS.side/Math.max(current.image.widthPx,current.image.heightPx));
      const canvas=document.createElement('canvas');canvas.width=Math.round(current.image.widthPx*factor);canvas.height=Math.round(current.image.heightPx*factor);
      if(Math.min(canvas.width,canvas.height)<16||canvas.width>1024||canvas.height>1024)throw Error('This image is too narrow. Place corners manually.');
      const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,canvas.width,canvas.height);
      const raster=context.getImageData(0,0,canvas.width,canvas.height);
      worker=new Worker('/web/photo-corners-worker.mjs',{type:'module'});
      worker.onmessage=event=>{
        if(token!==version||current!==target())return;
        worker.terminate();worker=null;$('findPhotoCorners').disabled=false;
        if(event.data.error){status('No draft changed. '+event.data.error);return;}
        report=event.data.report;source=current;
        for(const candidate of report.candidates){
          const button=document.createElement('button');button.type='button';button.className='photo-outline-choice';button.dataset.outline=candidate.id;button.setAttribute('aria-pressed','false');
          button.textContent='Inspect outline '+candidate.id.split('-')[1]+' · '+Math.round(candidate.coverage*100)+'% of image';
          button.onclick=()=>{selected=candidate;rotation=0;for(const node of $('photoCornerChoices').children)node.setAttribute('aria-pressed',String(node===button));status('Outline selected. Inspect and adjust it before using the draft.');redraw();openInspector();};
          $('photoCornerChoices').append(button);
        }
        $('photoCornersAnalysis').textContent='Analyzed '+report.width+' × '+report.height+' pixels; corners map to the original '+current.image.widthPx+' × '+current.image.heightPx+' image.'+(report.omitted?' '+report.omitted+' additional outlines omitted.':'');
        status(report.candidates.length?report.candidates.length+' outline'+(report.candidates.length===1?'':'s')+' found. Choose one to inspect.':'No complete four-sided outline found. Inspect and place the corners manually.');
      };
      worker.onerror=()=>{if(token===version){worker?.terminate();worker=null;$('findPhotoCorners').disabled=false;status('The scan could not finish. Place corners manually.');}};
      worker.postMessage({width:raster.width,height:raster.height,data:raster.data},[raster.data.buffer]);
    }catch(error){if(token===version){$('findPhotoCorners').disabled=false;status('No draft changed. '+error.message);}}
  };
  $('rotatePhotoCorners').onclick=()=>{
    if(!editing)return;editing.corners.push(editing.corners.shift());
    if(editing.evidence?.format==='skill-translator.photo-corners/v1'){
      editing.evidence.rotation=(editing.evidence.rotation+1)%4;
      const p=editing.evidence.proposedCorners;p.push(p.shift());
    }
    active=0;viewCenter=editing.corners[0];drawInspector();
  };
  $('usePhotoCorners').onclick=()=>{
    if(!editing||editing.source!==target()||!editing.corners.every(Boolean))return;
    const draft={corners:structuredClone(editing.corners),evidence:structuredClone(editing.evidence)};
    closeInspector();invalidate();propose(draft);
    status('Corners copied to the draft. Review dimensions, then Apply calibration.');
    clearPreview();redraw();$('applyCalibration').focus();
  };
  return {
    invalidate,
    instruction(){return points()?'Selected outline is a preview until you use its draft.':null;},
    render(svg,add,scale){
      $('findPhotoCorners').disabled=!target()||Boolean(worker);$('inspectPhotoCorners').disabled=!target();
      const p=points();if(!p)return;
      add(svg,'polygon',{points:p.map(q=>q.x+','+q.y).join(' '),fill:'none',stroke:'#79dece','stroke-width':3*scale,'stroke-dasharray':8*scale+' '+5*scale});
      p.forEach((q,i)=>{add(svg,'circle',{cx:q.x,cy:q.y,r:14*scale,fill:'#102928',stroke:'#79dece','stroke-width':2*scale});add(svg,'text',{x:q.x,y:q.y,'text-anchor':'middle','dominant-baseline':'central','font-size':14*scale,fill:'#d9fff8'},String(i+1));});
    }
  };
}

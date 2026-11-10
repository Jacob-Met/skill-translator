import {originalPhotoCorners,PHOTO_CORNERS_LIMITS} from '../src/photo-corners.mjs';
const $=id=>document.getElementById(id);
export function installPhotoCorners({target,propose,redraw}) {
  let worker=null,version=0,report=null,source=null,selected=null,rotation=0;
  const status=text=>$('photoCornersStatus').textContent=text;
  function clearPreview(){report=null;source=null;selected=null;rotation=0;$('photoCornerChoices').replaceChildren();$('usePhotoCorners').disabled=true;$('rotatePhotoCorners').disabled=true;}
  function invalidate({clear=false}={}){
    version++;worker?.terminate();worker=null;$('findPhotoCorners').disabled=!target();
    if(clear){clearPreview();status('Find visible four-sided regions, then choose which one is your workpiece.');redraw();}
  }
  function points(){if(!selected||source!==target())return null;return originalPhotoCorners(selected,report.width,report.height,source.image.widthPx,source.image.heightPx,rotation);}
  $('findPhotoCorners').onclick=async()=>{
    invalidate();clearPreview();redraw();const token=version,current=target();if(!current)return;
    $('findPhotoCorners').disabled=true;status('Inspecting the photo for four-sided regions…');
    try{
      const image=new Image();image.src=current.url;await image.decode();if(token!==version||current!==target())return;
      const factor=Math.min(1,PHOTO_CORNERS_LIMITS.side/Math.max(current.image.widthPx,current.image.heightPx));
      const canvas=document.createElement('canvas');canvas.width=Math.round(current.image.widthPx*factor);canvas.height=Math.round(current.image.heightPx*factor);
      if(Math.min(canvas.width,canvas.height)<16||canvas.width>1024||canvas.height>1024)throw Error('This image is too narrow for an outline proposal. Select corners manually.');
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
          button.textContent='Outline '+candidate.id.split('-')[1]+' · '+Math.round(candidate.coverage*100)+'% of image · '+candidate.polarity+' region';
          button.onclick=()=>{selected=candidate;rotation=0;for(const node of $('photoCornerChoices').children)node.setAttribute('aria-pressed',String(node===button));$('usePhotoCorners').disabled=false;$('rotatePhotoCorners').disabled=false;status('Previewing '+button.textContent+'. Check all four numbered corners on the photo. Rotate labels if corner 1 is not the physical top left.');redraw();};
          $('photoCornerChoices').append(button);
        }
        const sampling=report.width===current.image.widthPx&&report.height===current.image.heightPx?'Original raster analyzed.':'Analyzed a '+report.width+' × '+report.height+' preview; displayed corners map back to the original '+current.image.widthPx+' × '+current.image.heightPx+' pixels.';
        status(report.candidates.length?report.candidates.length+' outline'+(report.candidates.length===1?'':'s')+' found. Choose one to inspect; larger area does not mean the intended workpiece. '+sampling+(report.omitted?' '+report.omitted+' additional outlines omitted.':''):'No complete four-sided region found. Select the corners manually. Clipped edges, shadows, texture or low contrast can prevent a proposal. '+sampling);
      };
      worker.onerror=()=>{if(token===version){worker?.terminate();worker=null;$('findPhotoCorners').disabled=false;status('The outline scan could not finish. Manual corners remain available.');}};
      worker.postMessage({width:raster.width,height:raster.height,data:raster.data},[raster.data.buffer]);
    }catch(error){if(token===version){$('findPhotoCorners').disabled=false;status('No draft changed. '+error.message);}}
  };
  $('rotatePhotoCorners').onclick=()=>{rotation=(rotation+1)%4;redraw();status('Corner labels rotated. Check that 1–4 follow the physical top left, top right, bottom right, bottom left.');};
  $('usePhotoCorners').onclick=()=>{
    const corners=points();if(!corners)return;
    invalidate();
    propose({corners,evidence:{format:report.version,image:structuredClone(source.image),
      analysis:{width:report.width,height:report.height,kernel:report.kernel,settings:structuredClone(selected.settings)},
      selectedOutline:structuredClone(selected),rotation,proposedCorners:structuredClone(corners),
      limits:'Intensity-region outline proposal, reviewed by the author. Sampling, shadows, occlusion and texture can shift corners or omit a workpiece. The image does not identify the intended workpiece, dimensions, uncertainty or physical accuracy.'}});
    status('Outline copied to editable corner fields. Correct any corner and review your measured dimensions, then Apply calibration.');
    clearPreview();redraw();
  };
  return {
    invalidate,
    instruction(){return points()?"Preview only. Inspect the numbered corners, then choose Use outline as draft.":null;},
    render(svg,add,scale){
      $('findPhotoCorners').disabled=!target()||Boolean(worker);
      const p=points(),detail=$("photoOutlineDetail");detail.replaceChildren();detail.hidden=!p;if(!p)return;
      add(svg,'polygon',{points:p.map(q=>q.x+','+q.y).join(' '),fill:'none',stroke:'#79dece','stroke-width':3*scale,'stroke-dasharray':8*scale+' '+5*scale});
      p.forEach((q,i)=>{add(svg,'circle',{cx:q.x,cy:q.y,r:14*scale,fill:'#102928',stroke:'#79dece','stroke-width':2*scale});add(svg,'text',{x:q.x,y:q.y,'text-anchor':'middle','dominant-baseline':'central','font-size':14*scale,fill:'#d9fff8'},String(i+1));});
      detail.setAttribute("viewBox",svg.getAttribute("viewBox"));for(const node of svg.childNodes)detail.append(node.cloneNode(true));
    }
  };
}

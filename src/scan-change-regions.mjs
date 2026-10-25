import {compareSamplePixels, CHANGED_CHANNEL_LEVEL} from './visual-scan.mjs';
import {analyzePixels} from '../vendor/microverse/pixel-observations.mjs';

// Fixed profile, not a trained detector. A region is changed appearance only.
export function locateScanChanges(before, after) {
  const measures = compareSamplePixels(before, after);
  if (!Number.isFinite(before.presentedSeconds) || !Number.isFinite(after.presentedSeconds)
      || after.presentedSeconds <= before.presentedSeconds) {
    return {status: 'unavailable', reason: 'Distinct increasing presented times are required.', measures};
  }
  const width = before.widthPx, height = before.heightPx;
  if (width < 16 || height < 16) return {status: 'unavailable',
    reason: 'Region analysis requires samples at least 16 × 16; pixels are not enlarged.', measures};
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    let residual = 0;
    for (let c = 0; c < 3; c++) residual = Math.max(residual,
      Math.abs(after.rgba[i+c] - before.rgba[i+c] - measures.uniformBrightnessShift));
    const value = residual >= CHANGED_CHANNEL_LEVEL ? 255 : 0;
    data.set([value,value,value,255],i);
  }
  try {
    const analysis = analyzePixels({width,height,data}, {method:'global',
      polarity:'bright',threshold:127,minArea:4,maxArea:width*height});
    return {status:'analyzed',width,height,measures,changedPixels:analysis.foregroundPixels,
      regions:analysis.components.map(c=>({id:c.id,area:c.area,bbox:[...c.bbox],
        touchesBoundary:c.touchesBoundary,accepted:c.accepted,reason:c.reason})),
      profile:{channelThreshold:CHANGED_CHANNEL_LEVEL,minArea:4,connectivity:8}};
  } catch (error) {
    return {status:'unavailable',reason:String(error.message),measures};
  }
}

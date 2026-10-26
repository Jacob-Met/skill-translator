import json,math,hashlib,gzip,sys
from pathlib import Path
path=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).with_name('receipt.json.gz')
r=json.loads(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_bytes());assert r['completed'] and r['errors']==[];assert r['sourceSha256']=='06d2a4355d6d157bae34da5372b2cc6f36379e50c541f24017367dc047cb86fe';assert r['sourceBytes']==1006547
A=r['result']['adaptive'];U=r['result']['uniform'];close=lambda a,b:math.isclose(a,b,rel_tol=1e-12,abs_tol=1e-12)
selected=[i for i,p in enumerate(A['parents']) if p['fits']['16']['status']=='compared' and any(a['searchBoundary'] for a in p['fits']['16']['comparison']['alternatives'])];assert selected==A['selectedParentIndices'];assert len(selected)==6
assert len(A['initialSamples'])==10 and len(A['midpointSamples'])==6
for p,i in zip(A['midpointSamples'],selected):assert p['parentIndex']==i and close(p['requestedSeconds'],sum(A['parents'][i][k]['requestedSeconds'] for k in ['before','after'])/2)
all_samples=sorted(A['initialSamples']+A['midpointSamples'],key=lambda s:s['requestedSeconds']);assert len(all_samples)==len(U['samples'])==16
for S,rows in [(all_samples,A['final']),(U['samples'],U['final'])]:
 assert len(rows)==15
 for s in S:assert len(s['rgbaSha256'])==64 and not s.get('error') and (s['widthPx'],s['heightPx'])==(160,90)
 for i,row in enumerate(rows):
  for field,sample in [('before',S[i]),('after',S[i+1])]:
   for k in ['requestedSeconds','presentedSeconds','widthPx','heightPx']:assert row[field][k]==sample[k]
  assert row['after']['presentedSeconds']>row['before']['presentedSeconds']
 assert close(sum(row['after']['requestedSeconds']-row['before']['requestedSeconds'] for row in rows),9)
cache={p['key']:p for p in A['evaluatedPairs']};assert len(cache)==21
for p in A['parents']+A['final']:assert p==cache[p['key']]
assert len(set(p['key'] for p in A['parents'])-set(p['key'] for p in A['final']))==6
out={}
for name,policy,rows,reported in [('adaptive',A,A['final'],A['finalMetrics']),('uniform',U,U['final'],U['metrics'])]:
 assert policy['work']['sampleRequests']==policy['work']['successfulSamples']==16
 assert policy['work']['pairFitsPerRadius']==(21 if name=='adaptive' else 15)
 for radius in ['4','16']:
  fitrows=[p['fits'][radius] for p in rows];assert all(f['status']=='compared' for f in fitrows)
  contained=[p for p in rows if all(not a['searchBoundary'] for a in p['fits'][radius]['comparison']['alternatives'])]
  request=sum(p['after']['requestedSeconds']-p['before']['requestedSeconds'] for p in contained)
  actual=sum(p['after']['presentedSeconds']-p['before']['presentedSeconds'] for p in rows)
  cactual=sum(p['after']['presentedSeconds']-p['before']['presentedSeconds'] for p in contained)
  m=reported[radius];assert len(contained)==m['contained'];assert close(request,m['requestedContainedSeconds']);assert close(request/9,m['requestedContainedFraction']);assert close(actual,m['actualComparedSeconds']);assert close(cactual/actual,m['actualContainedFraction'])
  for key,metric in [('zero','meanZeroLevels'),('fit','meanFitLevels')]:
   val=sum((p['after']['presentedSeconds']-p['before']['presentedSeconds'])*p['fits'][radius]['comparison'][('zero' if key=='zero' else 'meanAdjustedChange')]['meanAdjustedChange']*255 for p in rows) if key=='zero' else sum((p['after']['presentedSeconds']-p['before']['presentedSeconds'])*p['fits'][radius]['comparison']['meanAdjustedChange']*255 for p in rows)
   assert close(val/actual,m[metric])
  expected=(160-2*int(radius))*(90-2*int(radius));assert all(f['comparison']['support']['pixelCount']==expected for f in fitrows)
  out[name+radius]={'containedIntervals':len(contained),'requestedFraction':request/9,'actualFraction':cactual/actual,'supportPixels':expected}
common=[]
for s in all_samples:
 for t in U['samples']:
  if s['requestedSeconds']==t['requestedSeconds']:
   assert s['rgbaSha256']==t['rgbaSha256'] and s['presentedSeconds']==t['presentedSeconds'];common.append(s['requestedSeconds'])
print(json.dumps({'audit':'pass','selectedParents':selected,'sameSourceCommonRequests':common,'requestsEach':16,'allFinalIntervalsEach':15,'adaptiveFitsEachRadius':21,'uniformFitsEachRadius':15,'results':out},indent=2))

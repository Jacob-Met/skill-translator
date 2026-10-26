"""Independent contiguous-interval / point-set oracle with NumPy SVD."""
import itertools,json,math,sys
import numpy as np
packet=json.load(open(sys.argv[1]))
examined=0;verified=0
for case in packet['cases']:
    frames=case['frames'];limit=case['threshold'];n=len(frames[0]);m=len(frames);accepted=[]
    for start,end in itertools.combinations(range(m),2):
        for size in range(2,n+1):
            for members in itertools.combinations(range(n),size):
                examined+=1
                if any(frames[t] is None or any(frames[t][i] is None for i in members) for t in range(start,end+1)):
                    continue
                maximum=0.;passed=True
                for a,b in itertools.combinations(range(start,end+1),2):
                    ac=np.array([frames[a][i] for i in members],dtype=float);bc=np.array([frames[b][i] for i in members],dtype=float)
                    ac-=ac.mean(axis=0);bc-=bc.mean(axis=0)
                    sa=float(np.sum(ac*ac));sb=float(np.sum(bc*bc));cov=ac.T@bc
                    strength=math.hypot(float(np.trace(cov)),float(cov[0,1]-cov[1,0]))
                    if sa<1e-12 or sb<1e-12 or strength<=1e-12*math.sqrt(sa*sb):passed=False;break
                    u,_,vt=np.linalg.svd(cov);d=np.eye(2);d[1,1]=np.linalg.det(u@vt);rotation=u@d@vt
                    error=float(np.linalg.norm(ac@rotation-bc,axis=1).max())
                    if error>limit+1e-9:passed=False;break
                    maximum=max(maximum,error)
                if passed:accepted.append((start,end,frozenset(members),maximum))
    frontier=[a for a in accepted if not any(b[0]<=a[0] and b[1]>=a[1] and b[2]>=a[2] and (b[0],b[1],b[2])!=(a[0],a[1],a[2]) for b in accepted)]
    key=lambda a:(a[0],a[1],tuple(sorted(a[2])))
    expected={key(a):a[3] for a in frontier}
    actual={(s['startIndex'],s['endIndex'],tuple(sorted(int(i.split('-')[-1])-1 for i in s['ids']))):s['maxResidualMm'] for s in case['result']['spans']}
    assert set(actual)==set(expected),(case['name'],set(actual)^set(expected))
    assert len(accepted)==case['result']['counts']['supportedPointSetIntervals'],case['name']
    for k,value in actual.items():assert abs(value-expected[k])<1e-8,(case['name'],k,value,expected[k])
    verified+=len(frontier)
print(json.dumps({'result':'PASS','cases':len(packet['cases']),'exhaustivePointSetIntervals':examined,'maximalSpansVerified':verified,'oracle':'Independent NumPy SVD, itertools point sets and intervals, direct pairwise dominance filtering'}))

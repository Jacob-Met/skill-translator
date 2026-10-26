"""Independent SVD oracle for nominal shared-motion subset receiving (NumPy)."""
import itertools, json, math, sys
import numpy as np
packet=json.load(open(sys.argv[1]))
checks=0
for case in packet['cases']:
    frames=case['frames']; limit=case['threshold']; n=len(frames[0]); valid=[]; outcomes={}
    for size in range(2,n+1):
        for ids in itertools.combinations(range(n),size):
            outcome='supported'
            for ia,ib in itertools.combinations(range(len(frames)),2):
                a=np.array([frames[ia][i] for i in ids],dtype=float); b=np.array([frames[ib][i] for i in ids],dtype=float)
                ac=a-a.mean(axis=0);bc=b-b.mean(axis=0)
                sa=float(np.sum(ac*ac));sb=float(np.sum(bc*bc))
                cov=ac.T@bc
                strength=math.hypot(float(np.trace(cov)),float(cov[0,1]-cov[1,0]))
                if sa<1e-12 or sb<1e-12 or strength<=1e-12*math.sqrt(sa*sb):
                    outcome='unresolved-orientation';break
                u,_,vt=np.linalg.svd(cov)
                d=np.eye(2);d[1,1]=np.linalg.det(u@vt)
                rotation=u@d@vt
                residual=np.linalg.norm(ac@rotation-bc,axis=1)
                if float(residual.max())>limit+1e-9:
                    outcome='outside-fit-threshold';break
            key=','.join('p'+str(i) for i in ids);outcomes[key]=outcome
            if outcome=='supported':valid.append(frozenset(ids))
    maximal=sorted(','.join('p'+str(i) for i in sorted(x)) for x in valid if not any(x<y for y in valid))
    actual=case['result']
    got=sorted(','.join(g['ids']) for g in actual['groups'])
    assert got==maximal,(case['name'],got,maximal)
    assert {','.join(x['ids']):x['status'] for x in actual['subsets']}==outcomes,case['name']
    for group in actual['groups']:
        ids=[int(x[1:]) for x in group['ids']]
        for finding in group['motions']:
            ia=int(finding['fromSourceId'].split('-')[-1]);ib=int(finding['toSourceId'].split('-')[-1])
            a=np.array([frames[ia][i] for i in ids]);b=np.array([frames[ib][i] for i in ids])
            ac=a-a.mean(axis=0);bc=b-b.mean(axis=0);u,_,vt=np.linalg.svd(ac.T@bc);d=np.eye(2);d[1,1]=np.linalg.det(u@vt);rot=u@d@vt
            err=np.linalg.norm(ac@rot-bc,axis=1)
            assert abs(float(err.max())-finding['maxResidualMm'])<1e-8
            assert abs(float(np.sqrt(np.mean(err**2)))-finding['remainingRmsMm'])<1e-8
    checks+=len(outcomes)
print(json.dumps({'result':'PASS','cases':len(packet['cases']),'independent_subset_classifications':checks,'oracle':'NumPy SVD proper orthogonal Procrustes; itertools subset enumeration'}))

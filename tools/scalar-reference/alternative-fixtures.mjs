// Fourteen bounded patterns; offset variants retain their own rounded input values.
export function additionalGateFixtures(){
 const n=33,fixtures=[];
 function noise(seed){let state=seed>>>0;return Array.from({length:n},()=>{state^=state<<13;state^=state>>>17;state^=state<<5;state>>>=0;return state/0x100000000-.5;});}
 function clock(first,last){const t=[0];for(let i=1;i<n;i++)t.push(t.at(-1)+(i>=first&&i<=last?2**-14:1));return t;}
 const middle=clock(14,19),early=clock(2,6),late=clock(27,31);
 function pair(id,times,values,seed,description){
  fixtures.push({id,seed,description,maximumGapSeconds:8,samples:times.map((timeSeconds,i)=>({timeSeconds,value:values[i]}))});
  fixtures.push({id:id+'-offset-control',seed,description:description+'; clock shift and independently rounded value-offset control',maximumGapSeconds:8,
   samples:times.map((t,i)=>({timeSeconds:8192+8*t,value:2**20+8*values[i]}))});
 }
 function spike(t,j,amplitude,slope,noiseScale,seed){const z=noise(seed);return t.map((v,i)=>slope*v/t.at(-1)+(i===j?amplitude:0)+noiseScale*z[i]);}
 function decay(t,j,tau,amplitude,slope,noiseScale,seed){const z=noise(seed);return t.map((v,i)=>slope*v/t.at(-1)+(i>=j?amplitude*Math.exp(-(v-t[j])/tau):0)+noiseScale*z[i]);}
 pair('spike-gate-middle-cluster',middle,spike(middle,16,1,0,2**-24,0x510001),0x510001,'Near-clean positive impulse in clustered observations');
 pair('spike-gate-early-negative',early,spike(early,3,-1,.125,2**-20,0x510002),0x510002,'Negative early impulse with continuous background');
 pair('spike-gate-late-small',late,spike(late,29,2**-10,1,2**-24,0x510003),0x510003,'Small late impulse on larger background');
 pair('decay-gate-middle-fast',middle,decay(middle,15,2**-12,1,0,2**-24,0xDE0001),0xDE0001,'Fast decay resolved within cluster');
 pair('decay-gate-early-slow-negative',early,decay(early,3,4,-1,.125,2**-20,0xDE0002),0xDE0002,'Negative early decay with ordinary-time tail');
 pair('decay-gate-late-small',late,decay(late,27,.5,2**-10,1,2**-24,0xDE0003),0xDE0003,'Small late decay with shortened tail');
 fixtures.push({id:'alt-gate-negative-constant',maximumGapSeconds:8,description:'No inserted event; exact constant',samples:middle.map(timeSeconds=>({timeSeconds,value:7}))});
 const z=noise(0xC00101);
 fixtures.push({id:'alt-gate-negative-smooth',seed:0xC00101,maximumGapSeconds:8,description:'No inserted event; smooth noisy signal',samples:middle.map((timeSeconds,i)=>({timeSeconds,value:timeSeconds/middle.at(-1)+2**-20*z[i]}))});
 return fixtures;
}

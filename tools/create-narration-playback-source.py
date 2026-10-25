"""Create an authored original video/audio and deliberately imperfect supplied VTT."""
import argparse,hashlib,json,math,subprocess,wave
from pathlib import Path

def run(args):
    return subprocess.run(args,check=True,text=True,capture_output=True)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    root=args.out.resolve();root.mkdir(parents=True,exist_ok=False)
    spoken=["Inspect the green square.","Now inspect the blue square."]
    supplied=[spoken[0],"Now inspect the glue square."]
    commands=[];durations=[]
    for i,text in enumerate(spoken):
        (root/("utterance-"+str(i)+".txt")).write_text(text+"\n")
        command=["ffmpeg","-hide_banner","-loglevel","error","-f","lavfi","-i",
                 "flite=textfile="+str(root/("utterance-"+str(i)+".txt"))+":voice=kal",
                 "-ar","48000","-c:a","pcm_s16le",str(root/("utterance-"+str(i)+".wav"))]
        run(command);commands.append(command)
        with wave.open(str(root/("utterance-"+str(i)+".wav")),"rb") as audio:
            durations.append(audio.getnframes()/audio.getframerate())
    gap=.4;second=durations[0]+gap;end=second+durations[1];duration=math.ceil(end+.5)
    video="color=c=0x14212b:size=320x180:rate=25:duration="+str(duration)
    video+=",drawbox=x=36:y=64:w=48:h=48:color=0x77dd88:t=fill:enable='lt(t,"+str(second)+")'"
    video+=",drawbox=x=236:y=64:w=48:h=48:color=0x6699ff:t=fill:enable='gte(t,"+str(second)+")'"
    command=["ffmpeg","-hide_banner","-loglevel","error",
             "-i",str(root/"utterance-0.wav"),"-i",str(root/"utterance-1.wav"),
             "-f","lavfi","-i",video,"-filter_complex",
             "[0:a]apad=pad_dur="+str(gap)+"[first];[first][1:a]concat=n=2:v=0:a=1,apad=whole_dur="+str(duration)+"[audio]",
             "-map","2:v","-map","[audio]","-t",str(duration),"-c:v","libvpx-vp9",
             "-b:v","0","-crf","35","-row-mt","1","-threads","1","-pix_fmt","yuv420p",
             "-c:a","libopus","-b:a","48k","-map_metadata","-1",str(root/"original.webm")]
    run(command);commands.append(command)
    def milliseconds(seconds):
        return math.floor(seconds*1000+.5)
    def timestamp(seconds):
        ms=milliseconds(seconds);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
        return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"
    intervals=[(0,durations[0]),(second,end)]
    transcript="WEBVTT\n\nNOTE Authored synthetic speech control. Times are authored from source synthesis segments.\nThe second supplied cue deliberately differs from spoken blue: glue. No ASR or timing authentication.\n\n"
    for i,((start,stop),text) in enumerate(zip(intervals,supplied)):
        transcript+=f"authored-{i+1}\n{timestamp(start)} --> {timestamp(stop)}\n<v Authored control>{text}\n\n"
    (root/"transcript.vtt").write_text(transcript)
    probe=json.loads(run(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(root/"original.webm")]).stdout)
    assert any(s["codec_type"]=="audio" for s in probe["streams"])
    assert any(s["codec_type"]=="video" for s in probe["streams"])
    files=[{"file":p.name,"bytes":p.stat().st_size,"sha256":hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(root.iterdir()) if p.is_file()]
    receipt={"schema":"skill-translator.authored-utterance-source/v1","spokenText":spoken,
             "suppliedText":supplied,"utteranceAudioSeconds":durations,"gapSeconds":gap,
             "authoredIntervals":[{"startSeconds":milliseconds(a)/1000,"endSeconds":milliseconds(b)/1000} for a,b in intervals],
             "videoDurationSeconds":float(probe["format"]["duration"]),"ffmpegVersion":run(["ffmpeg","-version"]).stdout.splitlines()[0],
             "generationCommands":commands,"streams":[{"codec":s["codec_name"],"type":s["codec_type"],"width":s.get("width"),"height":s.get("height"),"sampleRate":s.get("sample_rate")} for s in probe["streams"]],
             "files":files,"boundary":"New repository-authored synthetic speech/video and authored supplied transcript mismatch. Not the unavailable pinned CAPTIONVERSE binary, not an ASR result, a physical expert demonstration or authenticated speech/timing. Source Opus audio is retained in the original clip; video presentation timestamps do not identify sample-exact audio boundaries."}
    (root/"source.json").write_text(json.dumps(receipt,indent=2)+"\n")
    print(json.dumps({"out":str(root),"duration":receipt["videoDurationSeconds"],"intervals":receipt["authoredIntervals"],"files":files}))
if __name__=="__main__":
    main()

#!/usr/bin/env python3
"""Install the existing pinned optional OpenCV runtime beside this application."""
import pathlib,subprocess,sys,venv
root=pathlib.Path(__file__).resolve().parents[1]
target=root/'.venv-native'
if not (target/'pyvenv.cfg').exists():
 if target.exists():raise SystemExit('The .venv-native path already exists without a Python environment. Choose another extracted application directory.')
 venv.EnvBuilder(with_pip=True).create(target)
python=target/('Scripts/python.exe'if sys.platform=='win32'else'bin/python')
subprocess.run([str(python),'-m','pip','install','-r',str(root/'requirements-native-edge.txt')],check=True)
subprocess.run([str(python),'-c','import cv2,numpy;assert cv2.__version__=="4.13.0";assert numpy.__version__=="2.3.5";print("Native photo scanning ready: OpenCV "+cv2.__version__+", NumPy "+numpy.__version__)'],check=True)
print('Restart Skill Translator with its normal start script or node launch.mjs. The installed runtime is discovered automatically.')

"""Reproduce the approved serif interlocked AB reference as vector paths. Developer-only Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw
import re
root=Path(__file__).resolve().parents[1]
NAVY='#112C37'
# Traced in reference-image coordinates, excluding its white frame, variant number and caption.
# B is painted first, then A, preserving their interconnection. No font, gradient or accent line.
b='M528 414H654C810 414 813 546 686 573C830 579 838 746 645 746H528V738H594V600L580 490V421H528Z M626 422V565H659C754 565 756 422 655 422Z M626 580V737H650C766 737 766 580 671 580Z'
a='M336 738H376L499 414H515L641 738H675V746H528V738H592L486 474L383 738H434V746H336Z'
SCALE=.105;TX=-5.325;TY=-6.9

def svg(background=True):
 return '<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="18 18 72 72">'+(f'<path fill="{NAVY}" d="M0 0h108v108H0Z"/>' if background else '')+f'<g transform="translate({TX} {TY}) scale({SCALE})"><path fill="#FFFFFF" fill-rule="evenodd" d="{b}"/><path fill="#FFFFFF" d="{a}"/></g></svg>'
def contours(path):
 tokens=re.findall(r'[MLHVCZ]|-?\d+(?:\.\d+)?',path);i=0;cur=(0,0);points=[];shapes=[]
 def number():
  nonlocal i
  n=float(tokens[i]);i+=1;return n
 while i<len(tokens):
  command=tokens[i];i+=1
  if command=='Z':shapes.append(points);points=[];continue
  if command in ['M','L']:cur=(number(),number());points.append(cur)
  elif command=='H':cur=(number(),cur[1]);points.append(cur)
  elif command=='V':cur=(cur[0],number());points.append(cur)
  elif command=='C':
   c1=(number(),number());c2=(number(),number());end=(number(),number());start=cur
   for n in range(1,65):
    t=n/64;points.append(tuple((1-t)**3*start[j]+3*(1-t)**2*t*c1[j]+3*(1-t)*t*t*c2[j]+t**3*end[j] for j in [0,1]))
   cur=end
 if points:shapes.append(points)
 return shapes
def png(path,side,background=True,rounding=0):
 ss=4;viewport=72 if background else 108;origin=18 if background else 0;scale=side*ss/viewport;image=Image.new('RGBA',(side*ss,side*ss),NAVY if background else (0,0,0,0));draw=ImageDraw.Draw(image);clear=NAVY if background else (0,0,0,0)
 for path_data in [b,a]:
  for index,shape in enumerate(contours(path_data)):
   draw.polygon([(round((x*SCALE+TX-origin)*scale),round((y*SCALE+TY-origin)*scale)) for x,y in shape],fill='white' if index==0 else clear)
 if rounding:
  mask=Image.new('L',image.size,0);ImageDraw.Draw(mask).rounded_rectangle((0,0,image.width-1,image.height-1),radius=round(rounding*image.width),fill=255);image.putalpha(mask)
 image.resize((side,side),Image.Resampling.LANCZOS).save(path)
(root/'design/ab-icon.svg').write_text(svg())
png(root/'design/ab-icon-preview.png',512,True,.24)
res=root/'android/app/src/main/res'
vector=f'''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
 <group android:translateX="{TX}" android:translateY="{TY}" android:scaleX="{SCALE}" android:scaleY="{SCALE}">
  <path android:fillColor="#FFFFFF" android:fillType="evenOdd" android:pathData="{b}"/>
  <path android:fillColor="#FFFFFF" android:pathData="{a}"/>
 </group>
</vector>
'''
(res/'drawable-v24/ic_launcher_foreground.xml').write_text(vector)
(res/'values/ic_launcher_background.xml').write_text(f'<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">{NAVY}</color></resources>\n')
(res/'drawable/ic_launcher_background.xml').write_text(f'<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android"><solid android:color="{NAVY}"/></shape>\n')
for density,side in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
 folder=res/('mipmap-'+density);png(folder/'ic_launcher.png',side,True,.24);png(folder/'ic_launcher_round.png',side,True,.5);png(folder/'ic_launcher_foreground.png',round(side*2.25),False)
for version,mono in [('v26',''),('v33','\n <monochrome android:drawable="@drawable/ic_launcher_foreground"/>')]:
 folder=res/('mipmap-anydpi-'+version);folder.mkdir(exist_ok=True)
 xml='<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n <background android:drawable="@color/ic_launcher_background"/>\n <foreground android:drawable="@drawable/ic_launcher_foreground"/>'+mono+'\n</adaptive-icon>\n'
 for name in ['ic_launcher.xml','ic_launcher_round.xml']:(folder/name).write_text(xml)
print('Approved serif AB resources generated')

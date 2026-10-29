"""Regenerate original geometric AB launcher resources (developer-only Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
# Original paths, not a typeface or external logo. Safe-zone bounds: x 28..82, y 35..82.
a='M28 73L39 35H45L56 73H48L45 63H36L33 73Z M39 54H43L41 44Z'
b='M58 35H70C84 35 85 51 77 54C87 59 83 73 71 73H58Z M65 42V50H70C77 50 77 42 70 42Z M65 58V66H71C78 66 78 58 71 58Z'
def svg(background=True):
 return '<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108">'+('<path fill="#14243A" d="M0 0h108v108H0Z"/>' if background else '')+f'<path fill="#FFFFFF" fill-rule="evenodd" d="{a}"/><path fill="#FFFFFF" fill-rule="evenodd" d="{b}"/><path fill="#2478EB" d="M28 79h54v3H28Z"/></svg>'
def curve(start,c1,c2,end):
 return [tuple((1-t)**3*start[i]+3*(1-t)**2*t*c1[i]+3*(1-t)*t*t*c2[i]+t**3*end[i] for i in [0,1]) for t in [n/32 for n in range(1,33)]]
def png(path,side,background=True):
 scale=side*4/108;image=Image.new('RGBA',(side*4,side*4),'#14243A' if background else (0,0,0,0));draw=ImageDraw.Draw(image)
 def polygon(points,fill):draw.polygon([(round(x*scale),round(y*scale)) for x,y in points],fill=fill)
 clear='#14243A' if background else (0,0,0,0)
 polygon([(28,73),(39,35),(45,35),(56,73),(48,73),(45,63),(36,63),(33,73)],'white');polygon([(39,54),(43,54),(41,44)],clear)
 polygon([(58,35),(70,35)]+curve((70,35),(84,35),(85,51),(77,54))+curve((77,54),(87,59),(83,73),(71,73))+[(58,73)],'white')
 polygon([(65,42),(65,50),(70,50)]+curve((70,50),(77,50),(77,42),(70,42)),clear)
 polygon([(65,58),(65,66),(71,66)]+curve((71,66),(78,66),(78,58),(71,58)),clear)
 polygon([(28,79),(82,79),(82,82),(28,82)],'#2478EB')
 image.resize((side,side),Image.Resampling.LANCZOS).save(path)
(root/'design/ab-icon.svg').write_text(svg())
png(root/'design/ab-icon-preview.png',512)
res=root/'android/app/src/main/res'
vector=f'''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
 <path android:fillColor="#FFFFFF" android:fillType="evenOdd" android:pathData="{a}"/>
 <path android:fillColor="#FFFFFF" android:fillType="evenOdd" android:pathData="{b}"/>
 <path android:fillColor="#2478EB" android:pathData="M28 79h54v3H28Z"/>
</vector>
'''
(res/'drawable-v24/ic_launcher_foreground.xml').write_text(vector)
(res/'values/ic_launcher_background.xml').write_text('<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#14243A</color></resources>\n')
(res/'drawable/ic_launcher_background.xml').write_text('<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android"><solid android:color="#14243A"/></shape>\n')
for density,side in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
 folder=res/('mipmap-'+density)
 for name in ['ic_launcher.png','ic_launcher_round.png']:png(folder/name,side)
 png(folder/'ic_launcher_foreground.png',round(side*2.25),False)
for version,mono in [('v26',''),('v33','\n <monochrome android:drawable="@drawable/ic_launcher_foreground"/>')]:
 folder=res/('mipmap-anydpi-'+version);folder.mkdir(exist_ok=True)
 xml='<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n <background android:drawable="@color/ic_launcher_background"/>\n <foreground android:drawable="@drawable/ic_launcher_foreground"/>'+mono+'\n</adaptive-icon>\n'
 for name in ['ic_launcher.xml','ic_launcher_round.xml']:(folder/name).write_text(xml)
print('AB resources generated; package, app name and signing untouched')

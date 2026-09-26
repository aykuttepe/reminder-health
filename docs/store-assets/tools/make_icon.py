from PIL import Image, ImageDraw, ImageFilter
import math, sys
NAVY=(11,22,36); NAVY2=(21,40,58); MINT=(169,223,202); CREAM=(245,243,240); DEEP=(8,22,36)
def icon(size=1024, bg=True, scale=1.0):
    S=size*4
    im=Image.new('RGBA',(S,S),(0,0,0,0))
    d=ImageDraw.Draw(im)
    if bg:
        # subtle vertical gradient
        for y in range(S):
            t=y/S; c=tuple(int(NAVY2[i]*(1-t)+NAVY[i]*t) for i in range(3))
            d.line([(0,y),(S,y)],fill=c+(255,))
    cx=cy=S/2
    R=S*0.34*scale; w=S*0.045*scale
    # clock face: full ring with hour marks at 12, 3, 6 and 9
    d.ellipse([cx-R,cy-R,cx+R,cy+R],outline=MINT+(255,),width=int(w))
    tl=w*1.5; tw=w*0.8; ri=R-w*1.4
    for ang in (0,90,180,270):
        a=math.radians(ang); ux,uy=math.sin(a),-math.cos(a)
        px,py=cx+ux*ri,cy+uy*ri; qx,qy=cx+ux*(ri-tl),cy+uy*(ri-tl)
        d.line([(px,py),(qx,qy)],fill=MINT+(200,),width=int(tw))
        for (ex,ey) in ((px,py),(qx,qy)): d.ellipse([ex-tw/2,ey-tw/2,ex+tw/2,ey+tw/2],fill=MINT+(200,))
    # capsule, drawn horizontal then rotated
    cap=Image.new('RGBA',(S,S),(0,0,0,0)); cd=ImageDraw.Draw(cap)
    L=S*0.40*scale; H=S*0.155*scale
    x0,y0,x1,y1=cx-L/2,cy-H/2,cx+L/2,cy+H/2
    cd.rounded_rectangle([x0,y0,x1,y1],radius=H/2,fill=CREAM+(255,))
    left=Image.new('L',(S,S),0); ld=ImageDraw.Draw(left)
    ld.rounded_rectangle([x0,y0,x1,y1],radius=H/2,fill=255); ld.rectangle([cx,0,S,S],fill=0)
    mint=Image.new('RGBA',(S,S),MINT+(255,)); cap.paste(mint,(0,0),left)
    cd.line([(cx,y0+H*0.12),(cx,y1-H*0.12)],fill=DEEP+(90,),width=int(S*0.006))
    cap=cap.rotate(45,resample=Image.BICUBIC,center=(cx,cy))
    shadow=cap.split()[3].filter(ImageFilter.GaussianBlur(S*0.012))
    sh=Image.new('RGBA',(S,S),(0,0,0,110)); im.paste(sh,(int(S*0.006),int(S*0.012)),shadow)
    im.alpha_composite(cap)
    return im.resize((size,size),Image.LANCZOS)
if __name__=='__main__':
    out=sys.argv[1]
    icon(1024).save(out+'/icon_1024.png')
    i512=icon(512).convert('RGB'); i512.save(out+'/play-icon-512.png')

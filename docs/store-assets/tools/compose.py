from PIL import Image, ImageDraw, ImageFont, ImageFilter
import sys
S=sys.argv[1]; RAW=S+'/raw/'; OUT=S+'/store/'
BOLD='/System/Library/Fonts/Supplemental/Arial Bold.ttf'; REG='/System/Library/Fonts/Supplemental/Arial.ttf'
NAVY=(11,22,36); NAVY2=(24,46,66); MINT=(169,223,202); WHITE=(245,243,240); BORDER=(46,78,104)
def gradient(w,h):
    im=Image.new('RGB',(w,h)); d=ImageDraw.Draw(im)
    for y in range(h):
        t=y/h; d.line([(0,y),(w,y)],fill=tuple(int(NAVY2[i]*(1-t)+NAVY[i]*t) for i in range(3)))
    return im
def rounded(im,r):
    m=Image.new('L',im.size,0); ImageDraw.Draw(m).rounded_rectangle([0,0,im.size[0]-1,im.size[1]-1],radius=r,fill=255)
    out=im.convert('RGBA'); out.putalpha(m); return out
def phone(shot,h):
    w=int(shot.width*h/shot.height); s=shot.resize((w,h),Image.LANCZOS)
    pad=10; body=Image.new('RGBA',(w+2*pad,h+2*pad),(0,0,0,0))
    ImageDraw.Draw(body).rounded_rectangle([0,0,body.width-1,body.height-1],radius=58,fill=BORDER+(255,))
    body.alpha_composite(rounded(s,48),(pad,pad)); return body
def shadowed(canvas,layer,x,y,blur=28,off=18,alpha=150):
    # Pad before blurring so the shadow fades out instead of being clipped to the layer's box.
    p=blur*3; m=Image.new('L',(layer.width+2*p,layer.height+2*p),0); m.paste(layer.split()[3],(p,p))
    m=m.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: v*alpha//255)
    tmp=Image.new('RGBA',canvas.size,(0,0,0,0)); tmp.paste((0,0,0,255),(x-p,y+off-p),m)
    canvas.alpha_composite(tmp); canvas.alpha_composite(layer,(x,y))
def centered(d,text,font,y,fill,W):
    w=d.textlength(text,font=font); d.text(((W-w)/2,y),text,font=font,fill=fill)
def screenshot(name,title,sub,out,overlay=None):
    W,H=1080,1920; c=gradient(W,H).convert('RGBA'); d=ImageDraw.Draw(c)
    centered(d,title,ImageFont.truetype(BOLD,70),110,WHITE,W)
    centered(d,sub,ImageFont.truetype(REG,40),210,MINT,W)
    p=phone(Image.open(RAW+name+'.png').convert('RGB'),1480)
    shadowed(c,p,(W-p.width)//2,370)
    if overlay is not None:
        ow=960; o=overlay.resize((ow,int(overlay.height*ow/overlay.width)),Image.LANCZOS)
        shadowed(c,rounded(o,40),(W-ow)//2,520,blur=30,off=20,alpha=190)
    c.convert('RGB').save(OUT+out)
# notification card cropped from the shade screenshot
# Real expanded notification; its header row (placeholder icon and the system's English "now") is left
# out, and the card background is extended so the text keeps its padding.
shade=Image.open(RAW+'06-notification.png').convert('RGB')
body=shade.crop((165,688,995,1045)); bg=shade.getpixel((100,900))
card=Image.new('RGB',(body.width+60+45,body.height+40+40),bg); card.paste(body,(60,40))
shots=[('01-today','İlaç saatini kaçırmayın','Sıradaki doz ve randevular tek ekranda','screenshot-1.png',None),
       ('01-today','Bildirimden tek dokunuşla','İçtim, ertele ya da atla','screenshot-2.png',card),
       ('02-meds','Tüm ilaçlarınız bir arada','Günde birden çok saat, aç / tok bilgisi','screenshot-3.png',None),
       ('04-history','Neyi ne zaman aldığınızı görün','Son 7 gün ve günlük kayıtlar','screenshot-4.png',None),
       ('03-stock','İlacınız bitmeden haber alın','Kalan adet ve tahmini bitiş tarihi','screenshot-5.png',None),
       ('05-form','Kolayca ekleyin','Karekodu okutun ya da elle yazın','screenshot-6.png',None)]
for a in shots: screenshot(*a)
# feature graphic 1024x500
W,H=1024,500; c=gradient(W,H).convert('RGBA'); d=ImageDraw.Draw(c)
icon=Image.open(OUT+'icon_1024.png').convert('RGBA').resize((190,190),Image.LANCZOS)
shadowed(c,rounded(icon,42),70,70,blur=16,off=10,alpha=140)
d.text((70,292),'Rutin',font=ImageFont.truetype(BOLD,78),fill=WHITE)
d.text((72,385),'İlaç Hatırlatıcı',font=ImageFont.truetype(REG,36),fill=MINT)
d.text((72,436),'Sade · Reklamsız · Verileriniz telefonunuzda',font=ImageFont.truetype(REG,22),fill=(190,205,214))
today=Image.open(RAW+'01-today.png').convert('RGB').crop((0,0,1080,1500))
p=phone(today,560); shadowed(c,p,W-p.width-60,60,blur=20,off=12)
c.convert('RGB').save(OUT+'feature-graphic-1024x500.png')
print('ok')

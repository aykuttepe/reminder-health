// Renders every Rutin app icon from one vector definition of the four-petal mark.
// Usage (from mobile-app/): swift scripts/render-icons.swift
// Outputs Expo source assets, Android mipmaps/drawables and a Play Store listing icon.
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

// Palette, kept in sync with src/theme.ts (accent / bg).
let terracotta = CGColor(srgbRed: 205 / 255, green: 83 / 255, blue: 54 / 255, alpha: 1)
let cream = CGColor(srgbRed: 255 / 255, green: 247 / 255, blue: 235 / 255, alpha: 1)
let white = CGColor(srgbRed: 1, green: 1, blue: 1, alpha: 1)

// Mark geometry, measured from the approved artwork: gap ≈ 10.5% of a petal,
// inner (centre-facing) corner radius ≈ 11% of a petal; the other corners are fully round.
let gapRatio: CGFloat = 0.105
let innerRadiusRatio: CGFloat = 0.11

enum Background {
  case none
  case square(CGColor)
  case roundedSquare(CGColor, radiusRatio: CGFloat)
  case circle(CGColor)
}

/// Rect with independent corner radii (tl, tr, br, bl) in a y-down coordinate space.
func roundedRect(_ r: CGRect, tl: CGFloat, tr: CGFloat, br: CGFloat, bl: CGFloat) -> CGPath {
  let p = CGMutablePath()
  p.move(to: CGPoint(x: r.minX + tl, y: r.minY))
  p.addLine(to: CGPoint(x: r.maxX - tr, y: r.minY))
  p.addArc(tangent1End: CGPoint(x: r.maxX, y: r.minY), tangent2End: CGPoint(x: r.maxX, y: r.minY + tr), radius: tr)
  p.addLine(to: CGPoint(x: r.maxX, y: r.maxY - br))
  p.addArc(tangent1End: CGPoint(x: r.maxX, y: r.maxY), tangent2End: CGPoint(x: r.maxX - br, y: r.maxY), radius: br)
  p.addLine(to: CGPoint(x: r.minX + bl, y: r.maxY))
  p.addArc(tangent1End: CGPoint(x: r.minX, y: r.maxY), tangent2End: CGPoint(x: r.minX, y: r.maxY - bl), radius: bl)
  p.addLine(to: CGPoint(x: r.minX, y: r.minY + tl))
  p.addArc(tangent1End: CGPoint(x: r.minX, y: r.minY), tangent2End: CGPoint(x: r.minX + tl, y: r.minY), radius: tl)
  p.closeSubpath()
  return p
}

/// The four petals, centred in a canvas of `size`, overall width `size * scale`.
func markPath(size: CGFloat, scale: CGFloat) -> CGPath {
  let width = size * scale
  let petal = width / (2 + gapRatio)
  let gap = petal * gapRatio
  let outer = petal / 2
  let inner = petal * innerRadiusRatio
  let origin = (size - width) / 2
  let a = origin, b = origin + petal + gap
  let path = CGMutablePath()
  path.addPath(roundedRect(CGRect(x: a, y: a, width: petal, height: petal), tl: outer, tr: outer, br: inner, bl: outer))
  path.addPath(roundedRect(CGRect(x: b, y: a, width: petal, height: petal), tl: outer, tr: outer, br: outer, bl: inner))
  path.addPath(roundedRect(CGRect(x: a, y: b, width: petal, height: petal), tl: outer, tr: inner, br: outer, bl: outer))
  path.addPath(roundedRect(CGRect(x: b, y: b, width: petal, height: petal), tl: inner, tr: outer, br: outer, bl: outer))
  return path
}

func render(_ file: String, px: Int, background: Background, mark: CGColor, scale: CGFloat) {
  let size = CGFloat(px)
  guard let ctx = CGContext(
    data: nil, width: px, height: px, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
  ) else { fatalError("context \(file)") }
  // Flip to y-down so the path math reads like the artwork.
  ctx.translateBy(x: 0, y: size)
  ctx.scaleBy(x: 1, y: -1)
  ctx.setShouldAntialias(true)
  let full = CGRect(x: 0, y: 0, width: size, height: size)
  switch background {
  case .none: break
  case .square(let c): ctx.setFillColor(c); ctx.fill(full)
  case .roundedSquare(let c, let ratio):
    ctx.setFillColor(c)
    let r = size * ratio
    ctx.addPath(roundedRect(full, tl: r, tr: r, br: r, bl: r)); ctx.fillPath()
  case .circle(let c): ctx.setFillColor(c); ctx.fillEllipse(in: full)
  }
  ctx.setFillColor(mark)
  ctx.addPath(markPath(size: size, scale: scale))
  ctx.fillPath()

  let url = URL(fileURLWithPath: file)
  try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  guard let image = ctx.makeImage(),
        let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)
  else { fatalError("write \(file)") }
  CGImageDestinationAddImage(dest, image, nil)
  guard CGImageDestinationFinalize(dest) else { fatalError("finalize \(file)") }
  print("wrote \(file) \(px)px")
}

// Scales: full-bleed artwork uses the approved 60%. Launchers show only the inner 72dp of the
// 108dp adaptive canvas, so 0.40 × 108 ≈ 60% of the visible icon, well inside the 66dp safe circle.
let fullBleed: CGFloat = 0.60
let adaptive: CGFloat = 0.40
let legacy: CGFloat = 0.56
let notification: CGFloat = 0.92
let splash: CGFloat = 0.36

// Expo / store sources
render("assets/icon.png", px: 1024, background: .square(terracotta), mark: cream, scale: fullBleed)
render("assets/android-icon-background.png", px: 1024, background: .square(terracotta), mark: terracotta, scale: 0)
render("assets/android-icon-foreground.png", px: 1024, background: .none, mark: cream, scale: adaptive)
render("assets/android-icon-monochrome.png", px: 1024, background: .none, mark: white, scale: adaptive)
render("assets/notification-icon.png", px: 96, background: .none, mark: white, scale: notification)
render("assets/splash-icon.png", px: 1024, background: .none, mark: terracotta, scale: splash)
render("assets/favicon.png", px: 48, background: .roundedSquare(terracotta, radiusRatio: 0.22), mark: cream, scale: fullBleed)
render("assets/play-store-icon-512.png", px: 512, background: .square(terracotta), mark: cream, scale: fullBleed)

// Android resources (mdpi multiplier)
let res = "android/app/src/main/res"
let densities: [(String, CGFloat)] = [("mdpi", 1), ("hdpi", 1.5), ("xhdpi", 2), ("xxhdpi", 3), ("xxxhdpi", 4)]
for (name, m) in densities {
  let launcher = Int(48 * m), layer = Int(108 * m), notif = Int(24 * m), splashPx = Int(288 * m)
  let mip = "\(res)/mipmap-\(name)"
  render("\(mip)/ic_launcher.png", px: launcher, background: .roundedSquare(terracotta, radiusRatio: 0.2), mark: cream, scale: legacy)
  render("\(mip)/ic_launcher_round.png", px: launcher, background: .circle(terracotta), mark: cream, scale: legacy * 0.9)
  render("\(mip)/ic_launcher_background.png", px: layer, background: .square(terracotta), mark: terracotta, scale: 0)
  render("\(mip)/ic_launcher_foreground.png", px: layer, background: .none, mark: cream, scale: adaptive)
  render("\(mip)/ic_launcher_monochrome.png", px: layer, background: .none, mark: white, scale: adaptive)
  render("\(res)/drawable-\(name)/notification_icon.png", px: notif, background: .none, mark: white, scale: notification)
  render("\(res)/drawable-\(name)/splashscreen_logo.png", px: splashPx, background: .none, mark: terracotta, scale: splash)
}

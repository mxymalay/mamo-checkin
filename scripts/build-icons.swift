import AppKit
import Foundation
for size in [16,32,48,128,512] {
 let rep=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:size,pixelsHigh:size,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:rep)
 let scale=CGFloat(size)/128
 let transform=NSAffineTransform();transform.scale(by:scale);transform.concat()
 let bg=NSBezierPath(roundedRect:NSRect(x:4,y:4,width:120,height:120),xRadius:30,yRadius:30)
 NSColor(srgbRed:0,green:109.0/255.0,blue:174.0/255.0,alpha:1).setFill();bg.fill()
 let m=NSBezierPath();m.move(to:NSPoint(x:29,y:37));m.line(to:NSPoint(x:29,y:86));m.line(to:NSPoint(x:51,y:62));m.line(to:NSPoint(x:72,y:86));m.line(to:NSPoint(x:72,y:48));m.lineWidth=10;m.lineCapStyle = .round;m.lineJoinStyle = .round;NSColor.white.setStroke();m.stroke()
 let check=NSBezierPath();check.move(to:NSPoint(x:68,y:39));check.line(to:NSPoint(x:80,y:28));check.line(to:NSPoint(x:105,y:55));check.lineWidth=9;check.lineCapStyle = .round;check.lineJoinStyle = .round;NSColor(srgbRed:0.98,green:0.68,blue:0.79,alpha:1).setStroke();check.stroke()
 NSGraphicsContext.restoreGraphicsState()
 try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:"extension/icons/icon-\(size).png"))
}

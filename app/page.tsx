"use client";

import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Play, Pause, Trash2, Save, Upload } from "lucide-react";

interface Complex {
  re: number;
  im: number;
}

interface FourierPoint extends Complex {
  time: number;
}

interface FourierCoefficient extends Complex {
  freq: number;
  amp: number;
  phase: number;
}

export default function Component() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [path, setPath] = useState<Complex[]>([]);
  const [fourierPath, setFourierPath] = useState<FourierPoint[]>([]);
  const [animating, setAnimating] = useState(false);
  const animationRef = useRef<number>();
  const [drawColor, setDrawColor] = useState("#000000");
  const [arrowColor, setArrowColor] = useState("#ff0000");
  const [circleColor, setCircleColor] = useState("#0000ff");
  const [complexity, setComplexity] = useState(100);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 600 });
  const [fourierCoefficients, setFourierCoefficients] = useState<
    FourierCoefficient[]
  >([]);

  useEffect(() => {
    const updateCanvasSize = () => {
      const width = Math.min(window.innerWidth - 340, 800);
      const height = Math.min(window.innerHeight - 40, 800);
      setCanvasSize({ width, height });
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 2;

    const handleStart = (x: number, y: number) => {
      setDrawing(true);
      setPath([{ re: x - canvas.width / 2, im: y - canvas.height / 2 }]);
    };

    const handleMove = (x: number, y: number) => {
      if (!drawing) return;
      setPath((prevPath) => [
        ...prevPath,
        { re: x - canvas.width / 2, im: y - canvas.height / 2 },
      ]);
    };

    const handleEnd = () => {
      setDrawing(false);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      handleStart(e.clientX - rect.left, e.clientY - rect.top);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      handleMove(e.clientX - rect.left, e.clientY - rect.top);
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      handleStart(
        e.touches[0].clientX - rect.left,
        e.touches[0].clientY - rect.top
      );
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      handleMove(
        e.touches[0].clientX - rect.left,
        e.touches[0].clientY - rect.top
      );
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleEnd);
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchmove", handleTouchMove);
    canvas.addEventListener("touchend", handleEnd);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleEnd);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleEnd);
    };
  }, [drawing, drawColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = "#d0d0d0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Draw user path
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    path.forEach((point, index) => {
      const x = point.re + canvas.width / 2;
      const y = point.im + canvas.height / 2;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }, [path, drawColor, canvasSize]);

  const dft = (x: Complex[]): FourierCoefficient[] => {
    const X: FourierCoefficient[] = [];
    const N = x.length;
    for (let k = 0; k < N; k++) {
      let sum = { re: 0, im: 0 };
      for (let n = 0; n < N; n++) {
        const phi = (2 * Math.PI * k * n) / N;
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        sum.re += x[n].re * c + x[n].im * s;
        sum.im += -x[n].re * s + x[n].im * c;
      }
      sum.re /= N;
      sum.im /= N;
      const freq = k;
      const amp = Math.sqrt(sum.re * sum.re + sum.im * sum.im);
      const phase = Math.atan2(sum.im, sum.re);
      X[k] = { ...sum, freq, amp, phase };
    }
    return X;
  };

  const startAnimation = () => {
    if (path.length === 0) return;

    const fourier = dft(path);
    fourier.sort((a, b) => b.amp - a.amp);
    setFourierCoefficients(fourier);

    setAnimating(true);
    let t = 0;
    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Redraw grid and axes
      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "#d0d0d0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      let x = canvas.width / 2;
      let y = canvas.height / 2;

      for (let i = 0; i < Math.min(complexity, fourier.length); i++) {
        const prevX = x;
        const prevY = y;

        const { freq, amp, phase } = fourier[i];

        x += amp * Math.cos(freq * t + phase);
        y += amp * Math.sin(freq * t + phase);

        // Draw circle
        ctx.beginPath();
        ctx.strokeStyle = circleColor;
        ctx.arc(prevX, prevY, amp, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw arrow
        ctx.beginPath();
        ctx.strokeStyle = arrowColor;
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(y - prevY, x - prevX);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
          x - 10 * Math.cos(angle - Math.PI / 6),
          y - 10 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          x - 10 * Math.cos(angle + Math.PI / 6),
          y - 10 * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }

      fourierPath.push({
        re: x - canvas.width / 2,
        im: y - canvas.height / 2,
        time: Date.now(),
      });
      setFourierPath(fourierPath);

      // Draw path
      ctx.beginPath();
      ctx.strokeStyle = drawColor;
      fourierPath.forEach((point, index) => {
        const x = point.re + canvas.width / 2;
        const y = point.im + canvas.height / 2;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Remove old points
      setFourierPath((prevPath) =>
        prevPath.filter((point) => Date.now() - point.time < 5000)
      );

      t += ((2 * Math.PI) / path.length) * animationSpeed;
      if (t > 2 * Math.PI) {
        t = 0;
        setFourierPath([]);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setAnimating(false);
    setFourierPath([]);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPath([]);
    setFourierPath([]);
    setFourierCoefficients([]);
    stopAnimation();
  };

  const saveDrawing = () => {
    const drawingData = JSON.stringify({ path, drawColor });
    localStorage.setItem("fourierDrawing", drawingData);
    alert("Drawing saved!");
  };

  const loadDrawing = () => {
    const drawingData = localStorage.getItem("fourierDrawing");
    if (drawingData) {
      const { path: savedPath, drawColor: savedColor } =
        JSON.parse(drawingData);
      setPath(savedPath);
      setDrawColor(savedColor);
    } else {
      alert("No saved drawing found.");
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 min-h-screen">
      <div className="md:w-80 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Fourier Series Drawing
        </h1>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="drawColor">Draw Color</Label>
            <Input
              id="drawColor"
              type="color"
              value={drawColor}
              onChange={(e) => setDrawColor(e.target.value)}
              className="w-full h-10 p-1 border-gray-300"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arrowColor">Arrow Color</Label>
            <Input
              id="arrowColor"
              type="color"
              value={arrowColor}
              onChange={(e) => setArrowColor(e.target.value)}
              className="w-full h-10 p-1 border-gray-300"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="circleColor">Circle Color</Label>
            <Input
              id="circleColor"
              type="color"
              value={circleColor}
              onChange={(e) => setCircleColor(e.target.value)}
              className="w-full h-10 p-1 border-gray-300"
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="complexity">Complexity: {complexity}</Label>
            <Slider
              id="complexity"
              min={1}
              max={200}
              step={1}
              value={[complexity]}
              onValueChange={(value) => setComplexity(value[0])}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="animationSpeed">
              Animation Speed: {animationSpeed.toFixed(1)}x
            </Label>
            <Slider
              id="animationSpeed"
              min={0.1}
              max={5}
              step={0.1}
              value={[animationSpeed]}
              onValueChange={(value) => setAnimationSpeed(value[0])}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Button
              onClick={animating ? stopAnimation : startAnimation}
              className="w-full"
            >
              {animating ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Animation
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Animation
                </>
              )}
            </Button>
            <Button
              onClick={clearCanvas}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Canvas
            </Button>
            <Button
              onClick={saveDrawing}
              className="w-full bg-green-500 hover:bg-green-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Drawing
            </Button>
            <Button
              onClick={loadDrawing}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              <Upload className="w-4 h-4 mr-2" />
              Load Drawing
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Draw a shape on the canvas, then click "Start Animation" to see the
          Fourier series representation.
        </div>
      </div>
      <div className="flex-grow flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="border border-gray-300 bg-white shadow-md"
        />
      </div>
      <div className="md:w-80 space-y-4 overflow-y-auto max-h-[calc(100vh-2rem)]">
        <h2 className="text-xl font-bold text-gray-800">
          Fourier Coefficients
        </h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>Fourier Series Equation:</p>
          <p className="font-mono">f(t) = ∑ (A_n * cos(nωt + φ_n))</p>
          <p>Where:</p>
          <ul className="list-disc list-inside">
            <li>A_n: Amplitude</li>
            <li>n: Frequency</li>
            <li>ω: Angular frequency</li>
            <li>φ_n: Phase shift</li>
            <li>t: Time</li>
          </ul>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">n</th>
                <th className="p-2">A</th>
                <th className="p-2">φ</th>
              </tr>
            </thead>
            <tbody>
              {fourierCoefficients.map((coeff, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="p-2">{coeff.freq}</td>
                  <td className="p-2">{coeff.amp.toFixed(4)}</td>
                  <td className="p-2">{coeff.phase.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

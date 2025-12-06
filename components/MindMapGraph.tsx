import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { MindMapNode } from '../types';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

// Cast d3 to any to bypass type definition errors with the namespace in the current environment
const D3 = d3 as any;

interface MindMapGraphProps {
  data: MindMapNode;
}

export interface MindMapGraphRef {
  downloadImage: (filename: string) => void;
}

const MindMapGraph = forwardRef<MindMapGraphRef, MindMapGraphProps>(({ data }, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useImperativeHandle(ref, () => ({
    downloadImage: (filename: string) => {
      if (!svgRef.current) return;
      
      const svgElement = svgRef.current;
      const { width, height } = dimensions;
      
      // Serialize SVG
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);
      
      // Ensure namespace is present
      if(!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
          svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // Create Canvas
      const canvas = document.createElement("canvas");
      // Scale up for better resolution
      const scale = 2; 
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) return;
      ctx.scale(scale, scale);
      
      // Create Image
      const img = new Image();
      const svgBlob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        // Draw dark background first (since SVG is transparent usually)
        ctx.fillStyle = "#0f172a"; // Match app background (slate-900)
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0);
        
        try {
          const pngUrl = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.href = pngUrl;
          downloadLink.download = `${filename}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } catch (e) {
          console.error("Export failed", e);
        }
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    }
  }));

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        setDimensions({
          width: wrapperRef.current.offsetWidth,
          height: wrapperRef.current.offsetHeight || 600
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = D3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const { width, height } = dimensions;
    const margin = { top: 20, right: 90, bottom: 30, left: 90 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 1. Create the group element FIRST so it's available for the zoom handler
    const g = svg.append("g");

    // 2. Define Zoom behavior
    const zoom = D3.zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event: any) => {
        g.attr("transform", event.transform);
      });

    // 3. Attach zoom to SVG
    svg.call(zoom);

    // 4. Initial transform to center nicely (triggers the zoom event immediately)
    const initialTransform = D3.zoomIdentity
        .translate(margin.left, margin.top)
        .scale(0.8);
    svg.call(zoom.transform, initialTransform);

    // Create a hierarchy
    const root = D3.hierarchy(data);
    
    // Tree layout
    const treeLayout = D3.tree().size([innerHeight, innerWidth]);
    treeLayout(root);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", D3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x)
      )
      .attr("fill", "none")
      .attr("stroke", "#64748b")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.6);

    // Nodes
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", (d: any) => `node ${d.children ? "node--internal" : "node--leaf"}`)
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`);

    // Node Circles
    node.append("circle")
      .attr("r", (d: any) => d.depth === 0 ? 8 : 5)
      .attr("fill", (d: any) => d.depth === 0 ? "#6366f1" : d.children ? "#a855f7" : "#06b6d4")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2);

    // Node Labels
    node.append("text")
      .attr("dy", ".35em")
      .attr("x", (d: any) => d.children ? -12 : 12)
      .style("text-anchor", (d: any) => d.children ? "end" : "start")
      .text((d: any) => d.data.name)
      .style("font-size", "12px")
      .style("font-family", "Inter, sans-serif")
      .style("fill", "#f8fafc")
      .style("text-shadow", "2px 2px 4px rgba(0,0,0,0.8)"); // Improved readability against links

  }, [data, dimensions]);

  return (
    <div ref={wrapperRef} className="w-full h-[600px] bg-dark rounded-xl border border-slate-700 relative overflow-hidden group">
       <div className="absolute top-4 left-4 z-10 bg-slate-800/80 backdrop-blur rounded-lg px-3 py-1 text-xs text-slate-300 border border-slate-700 pointer-events-none">
         Knowledge Map
       </div>
       <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white shadow-lg" onClick={() => {
              if (svgRef.current) {
                 D3.select(svgRef.current).transition().duration(750).call(D3.zoom().transform, D3.zoomIdentity.translate(dimensions.width/2 - 300, dimensions.height/2).scale(1));
              }
          }}>
             <Maximize size={16} />
          </button>
       </div>
      <svg ref={svgRef} className="w-full h-full cursor-move" />
    </div>
  );
});

export default MindMapGraph;
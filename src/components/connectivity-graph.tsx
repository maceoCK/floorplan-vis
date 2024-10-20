"use client"

import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { Simulation, SimulationNodeDatum } from 'd3-force'

interface Room {
  id: number
  x: number
  y: number
  type: string
  number: string
  size: string
  name: string
}

interface Connectivity {
  source: number
  target: number
  value: number
}

interface ConnectivityGraphProps {
  rooms: Room[]
  connectivity: Connectivity[]
  setConnectivity: React.Dispatch<React.SetStateAction<Connectivity[]>>
}

const ROOM_COLORS_DARK = {
  "living_room": "#FF6B6B", "kitchen": "#4ECDC4", "bedroom": "#45B7D1", "bathroom": "#66D7D1", 
  "balcony": "#95E1D3", "entrance": "#FCE38A", "dining room": "#F38181", "study room": "#A8D8EA", 
  "storage": "#AA96DA", "front door": "#FCBAD3", "unknown": "#FFFFD2", "interior_door": "#E3FDFD"
}

export function ConnectivityGraph({ rooms, connectivity, setConnectivity }: ConnectivityGraphProps) {
  const connectivitySvgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<Simulation<SimulationNodeDatum & { id: number }, { source: number; target: number; value: number }> | null>(null)

  useEffect(() => {
    drawConnectivity()
  }, [rooms, connectivity])

  const drawConnectivity = () => {
    const svg = d3.select(connectivitySvgRef.current)
    svg.selectAll("*").remove() // Clear previous drawings

    const width = 500
    const height = 500

    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation()
        .force("link", d3.forceLink().id((d: any) => d.id).distance(200))
        .force("charge", d3.forceManyBody().strength(-40))
        .force("center", d3.forceCenter(width / 2, height / 2))
    }

    const simulation = simulationRef.current
    if (simulation) {
      simulation.nodes(rooms as (SimulationNodeDatum & { id: number })[])
      simulation.force("link", d3.forceLink(connectivity).id((d: any) => d.id).distance(150))
    }
    // Draw links
    const link = svg.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(connectivity)
      .enter().append("line")
      .attr("stroke", "#888")
      .attr("stroke-width", 2)

    // Draw nodes
    const node = svg.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(rooms)
      .enter().append("circle")
      .attr("r", 40)
      .attr("fill", (d: Room) => ROOM_COLORS_DARK[d.type as keyof typeof ROOM_COLORS_DARK])

    // Edge drawing variables
    let isDrawingEdge = false
    let sourceNode: Room | null = null
    let tempEdge: any = null

    // Event handlers for edge creation
    node.on("mousedown", function(event: any, d: Room) {
      isDrawingEdge = true
      sourceNode = d

      // Add a temporary line to follow the cursor
      tempEdge = svg.append("line")
        .attr("class", "temp-edge")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("x1", d.x)
        .attr("y1", d.y)
        .attr("x2", d.x)
        .attr("y2", d.y)

      event.stopPropagation()
    })

    svg.on("mousemove", function(event: any) {
      if (isDrawingEdge && tempEdge && sourceNode) {
        const coords = d3.pointer(event)
        tempEdge
          .attr("x1", sourceNode.x)
          .attr("y1", sourceNode.y)
          .attr("x2", coords[0])
          .attr("y2", coords[1])
      }
    })

    svg.on("mouseup", (event: any) => {
      if (isDrawingEdge) {
        const [x, y] = d3.pointer(event)
        const targetNode = getNodeAtPosition(x, y, rooms)

        if (targetNode && sourceNode) {
          if (connectivity.find(c => {
            if (sourceNode && targetNode) {
              return c.source === sourceNode.id && c.target === targetNode.id
            }
            return false
          })) {  
            // Edge already exists, remove it
            setConnectivity(prevConnectivity => prevConnectivity.filter(c => {
              if (sourceNode && targetNode) {
                return !(c.source === sourceNode.id && c.target === targetNode.id)
              }
              return false
            }))
          } else {
            setConnectivity(prevConnectivity => {
              if (sourceNode && targetNode) {
                return [
                    ...prevConnectivity,
                    { source: sourceNode.id, target: targetNode.id, value: 1 }
                ]
              }
              return prevConnectivity
            })
          }
        }
        if (tempEdge) tempEdge.remove()
        isDrawingEdge = false
        sourceNode = null
        tempEdge = null
      }
    })

    // Draw labels
    const label = svg.append("g")
      .selectAll("text")
      .data(rooms)
      .enter().append("text")
      .text((d: Room) => d.name)
      .attr("font-size", "12px")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .style("pointer-events", "none")
      .attr("dy", ".35em")
      .attr("fill", "black")

    if (simulation) {
      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x || 0)
        .attr("y1", (d: any) => d.source.y || 0)
        .attr("x2", (d: any) => d.target.x || 0)
        .attr("y2", (d: any) => d.target.y || 0)

      node
        .attr("cx", (d: any) => d.x || 0)
        .attr("cy", (d: any) => d.y || 0)

      label
        .attr("x", (d: any) => d.x || 0)
        .attr("y", (d: any) => d.y || 0)
      })
    

    // Restart the simulation
      simulation.alpha(1).restart()
    }
  }

  function getNodeAtPosition(x: number, y: number, nodes: Room[]) {
    return nodes.find(node => Math.abs(node.x - x) < 20 && Math.abs(node.y - y) < 20)
  }

  return (
    <div>
      <svg
        ref={connectivitySvgRef}
        width={500}
        height={500}
        className="border border-gray-300"
      />
      <p className="text-sm text-gray-600 mt-2">Click and drag to create edges</p>
    </div>
  )
}

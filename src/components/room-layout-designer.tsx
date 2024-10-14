"use client"

import React, { useState, useRef, useEffect, MutableRefObject } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import * as d3 from 'd3'
import { Simulation, SimulationNodeDatum } from 'd3-force'

const ROOM_CLASS = {
  "living_room": 1, "kitchen": 2, "bedroom": 3, "bathroom": 4, "balcony": 5, "entrance": 6,
  "dining room": 7, "study room": 8, "storage": 10, "front door": 11, "unknown": 13, "interior_door": 12
}

const ROOM_COLORS = {
  "living_room": "#FF6B6B", "kitchen": "#4ECDC4", "bedroom": "#45B7D1", "bathroom": "#66D7D1", 
  "balcony": "#95E1D3", "entrance": "#FCE38A", "dining room": "#F38181", "study room": "#A8D8EA", 
  "storage": "#AA96DA", "front door": "#FCBAD3", "unknown": "#FFFFD2", "interior_door": "#E3FDFD"
}

export function RoomLayoutDesignerComponent() {
  const [rooms, setRooms] = useState<Array<{ id: number, x: number, y: number, type: string, number: string, size: string }>>([])
  const [connectivity, setConnectivity] = useState<{source: number, target: number, value: number}[]>([])
  const [boundary, setBoundary] = useState<Array<{ x: number, y: number, width: number, height: number }>>([])
  const [currentRoom, setCurrentRoom] = useState({ type: '', number: '', size: '' })
  const connectivitySvgRef = useRef(null)
  const boundaryCanvasRef = useRef(null)
  const simulationRef = useRef(null)

  useEffect(() => {
    drawConnectivity()
    drawBoundary()
  }, [rooms, connectivity, boundary])

  const handleRoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentRoom({ ...currentRoom, [e.target.name]: e.target.value })
  }

  const addRoom = () => {
    if (currentRoom.type && currentRoom.number && currentRoom.size) {
      const newRoom = { ...currentRoom, id: rooms.length, x: Math.random() * 500, y: Math.random() * 500 }
      setRooms((prevRooms: Array<{ id: number, x: number, y: number, type: string, number: string, size: string }>) => [...prevRooms, newRoom])
      setCurrentRoom({ type: '', number: '', size: '' })
      updateConnectivity(newRoom as { id: number, x: number, y: number, type: string, number: string, size: string })
    }
  }
  const convertBoundaryToCorners = (boundaryArray: Array<{x: number, y: number, width: number, height: number}> | null) => {
    if (!boundaryArray || !Array.isArray(boundaryArray)) {
      return [];
    }

    let corners = []

    for (const rect of boundaryArray) {
      corners.push({x: rect.x, y: rect.y})
      corners.push({x: rect.x + rect.width, y: rect.y})
      corners.push({x: rect.x, y: rect.y + rect.height})
      corners.push({x: rect.x + rect.width, y: rect.y + rect.height})
    }

    // remove duplicates
    corners = corners.filter((corner, index, self) =>
      index === self.findIndex((t) => (
        t.x === corner.x && t.y === corner.y
      )
    ))

    // remove corners that are inside a rectangle
    

    // Check for intersections between all pairs of edges
    for (let i = 0; i < boundaryArray.length; i++) {
      for (let j = i + 1; j < boundaryArray.length; j++) {
        const rect1 = boundaryArray[i];
        const rect2 = boundaryArray[j];

        // Define edges for rect1
        const edges1 = [
          [{x: rect1.x, y: rect1.y}, {x: rect1.x + rect1.width, y: rect1.y}],
          [{x: rect1.x + rect1.width, y: rect1.y}, {x: rect1.x + rect1.width, y: rect1.y + rect1.height}],
          [{x: rect1.x + rect1.width, y: rect1.y + rect1.height}, {x: rect1.x, y: rect1.y + rect1.height}],
          [{x: rect1.x, y: rect1.y + rect1.height}, {x: rect1.x, y: rect1.y}]
        ];

        // Define edges for rect2
        const edges2 = [
          [{x: rect2.x, y: rect2.y}, {x: rect2.x + rect2.width, y: rect2.y}],
          [{x: rect2.x + rect2.width, y: rect2.y}, {x: rect2.x + rect2.width, y: rect2.y + rect2.height}],
          [{x: rect2.x + rect2.width, y: rect2.y + rect2.height}, {x: rect2.x, y: rect2.y + rect2.height}],
          [{x: rect2.x, y: rect2.y + rect2.height}, {x: rect2.x, y: rect2.y}]
        ];

        // Check intersections between all edges of rect1 and rect2
        for (const edge1 of edges1) {
          for (const edge2 of edges2) {
            const intersection = findIntersection(edge1[0], edge1[1], edge2[0], edge2[1]);
            if (intersection) {
              corners.push(intersection);
            }
          }
        }
      }
    }

    // Remove duplicates
    corners = corners.filter((corner, index, self) =>
      index === self.findIndex((t) => (
        Math.abs(t.x - corner.x) < 1e-10 && Math.abs(t.y - corner.y) < 1e-10
      ))
    );

    corners = corners.filter((corner) => {
      for (const rect of boundaryArray) {
        if (corner.x > rect.x && corner.x < rect.x + rect.width &&
            corner.y > rect.y && corner.y < rect.y + rect.height) {
          return false
        }
      }
      return true
    })

    return corners;
  };

  function findIntersection(p1: {x: number, y: number}, p2: {x: number, y: number}, p3: {x: number, y: number}, p4: {x: number, y: number}): {x: number, y: number} | null {
    const denominator =
      (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  
    // If denominator is 0, the lines are parallel
    if (denominator === 0) {
      return null;
    }
  
    const t =
      ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) /
      denominator;
    const u =
      ((p1.x - p3.x) * (p1.y - p2.y) - (p1.y - p3.y) * (p1.x - p2.x)) /
      denominator;
  
    // Check if the intersection point lies on both lines (for line segments)
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const intersectionX = p1.x + t * (p2.x - p1.x);
      const intersectionY = p1.y + t * (p2.y - p1.y);
      return { x: intersectionX, y: intersectionY };
    }
  
    // No intersection within the line segments
    return null;
  }
  

  const updateConnectivity = (newRoom: {id: number, x: number, y: number, type: string, number: string, size: string}) => {
    setConnectivity(prevConnectivity => [
      ...prevConnectivity,
      ...rooms.map((room: {id: number, x: number, y: number, type: string, number: string, size: string}) => ({source: room.id, target: newRoom.id, value: -1}))
    ])
  }

  const drawConnectivity = () => {
    const svg = d3.select(connectivitySvgRef.current)
    svg.selectAll("*").remove()

    const width = 500
    const height = 500

    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation()
        .force("link", d3.forceLink().id((d: { id: number }) => d.id))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
    }

    const simulation = simulationRef.current as unknown as Simulation<
      SimulationNodeDatum & { id: number },
      { source: number; target: number; value: number }
    >

    if (!simulation) {
      return
    }

    simulation.nodes(rooms as Array<{ id: number, x: number, y: number, type: string, number: string, size: string }>)
    simulation.force("link", d3.forceLink(connectivity as Array<{ source: number, target: number, value: number }>))

    const link = svg.append("g")
      .selectAll("line")
      .data(connectivity)
      .enter().append("line")
      .attr("stroke", (d: { value: number }) => d.value === 1 ? "#4CAF50" : "#ccc")
      .attr("stroke-width", 2)
      .on("click", (event: any, d: any) => {
        d.value = d.value === 1 ? -1 : 1
        setConnectivity([...connectivity])
      })

    const node = svg.append("g")
      .selectAll("circle")
      .data(rooms)
      .enter().append("circle")
      .attr("r", 20)
      .attr("fill", (d: { type: string }) => ROOM_COLORS[d.type as keyof typeof ROOM_COLORS])
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    const label = svg.append("g")
      .selectAll("text")
      .data(rooms)
      .enter().append("text")
      .text((d: { number: string }) => d.number)
      .attr("font-size", "12px")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("fill", "white")

    simulation.on("tick", () => {
      link
        .attr("x1", (d: { source: { x: number, y: number } }) => d.source.x || 0)
        .attr("y1", (d: { source: { x: number, y: number } }) => d.source.y || 0)
        .attr("x2", (d: { target: { x: number, y: number } }) => d.target.x || 0)
        .attr("y2", (d: { target: { x: number, y: number } }) => d.target.y || 0)

      node
        .attr("cx", (d: { x: number }) => d.x || 0)
        .attr("cy", (d: { y: number }) => d.y || 0)

      label
        .attr("x", (d: { x: number }) => d.x || 0)
        .attr("y", (d: { y: number }) => d.y || 0)
    })

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: any) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    // Restart the simulation
    simulation.alpha(1).restart()
  }

  const drawBoundary = () => {
    const canvas = boundaryCanvasRef.current as unknown as HTMLCanvasElement
    if (!canvas) return

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = 'white'
    boundary.forEach((rect: { x: number, y: number, width: number, height: number }) => {
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    })
  }

  const handleBoundaryDraw = () => {
    const canvas = boundaryCanvasRef.current as unknown as HTMLCanvasElement
    if (!canvas) return

    let isDrawing = false
    let startX: number, startY: number

    const startDraw = (e: MouseEvent) => {
      isDrawing = true
      const rect = canvas.getBoundingClientRect()
      startX = e.clientX - rect.left
      startY = e.clientY - rect.top
    }

    const draw = (e: MouseEvent) => {
      if (!isDrawing) return
      const rect = canvas.getBoundingClientRect()
      const endX = e.clientX - rect.left
      const endY = e.clientY - rect.top

      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawBoundary()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.fillRect(
        Math.min(startX, endX),
        Math.min(startY, endY),
        Math.abs(endX - startX),
        Math.abs(endY - startY)
      )
    }

    const endDraw = (e: MouseEvent) => {
      if (!isDrawing) return
      isDrawing = false
      const rect = canvas.getBoundingClientRect()
      const endX = e.clientX - rect.left
      const endY = e.clientY - rect.top

      setBoundary((prevBoundary) => [
        ...prevBoundary,
        {
          x: Math.min(startX, endX),
          y: Math.min(startY, endY),
          width: Math.abs(endX - startX),
          height: Math.abs(endY - startY)
        }
      ])
    }

    canvas.addEventListener('mousedown', startDraw)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', endDraw)
    canvas.addEventListener('mouseout', endDraw)

    return () => {
      canvas.removeEventListener('mousedown', startDraw)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', endDraw)
      canvas.removeEventListener('mouseout', endDraw)
    }
  }

  useEffect(() => {
    const cleanup = handleBoundaryDraw()
    return cleanup
  }, [])

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Room Layout Designer</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Room Data Input</h2>
        <div className="flex space-x-4 mb-2">
          <div>
            <Label htmlFor="roomType">Room Type</Label>
            <Select
              name="type"
              value={currentRoom.type}
              onValueChange={(value) => handleRoomInputChange({ 
                target: { name: 'type', value }
              } as React.ChangeEvent<HTMLInputElement>)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select room type" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(ROOM_CLASS).map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="roomNumber">Room Number</Label>
            <Input
              id="roomNumber"
              name="number"
              value={currentRoom.number}
              onChange={handleRoomInputChange}
              placeholder="Room number"
            />
          </div>
          <div>
            <Label htmlFor="roomSize">Room Size</Label>
            <Input
              id="roomSize"
              name="size"
              value={currentRoom.size}
              onChange={handleRoomInputChange}
              placeholder="Room size"
            />
          </div>
        </div>
        <Button onClick={addRoom}>Add Room</Button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Room List</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room Type</TableHead>
              <TableHead>Room Number</TableHead>
              <TableHead>Room Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room, index) => (
              <TableRow key={index}>
                <TableCell>{room.type}</TableCell>
                <TableCell>{room.number}</TableCell>
                <TableCell>{room.size}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Room Connectivity</h2>
        <svg
          ref={connectivitySvgRef}
          width={500}
          height={500}
          className="border border-gray-300"
        />
        <p className="text-sm text-gray-600 mt-2">Drag nodes to reposition. Click on edges to toggle connections.</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Boundary Drawing</h2>
        <canvas
          ref={boundaryCanvasRef}
          width={500}
          height={500}
          className="border border-gray-300"
        />
        <p className="text-sm text-gray-600 mt-2">Click and drag to draw rectangles</p>
        <Button onClick={() => setBoundary([])} className="mt-2">Clear Boundary</Button>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Data Output</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">Rooms:</h3>
            <pre className="bg-gray-100 p-2 rounded text-black">{JSON.stringify(rooms, null, 2)}</pre>
          </div>
          <div>
            <h3 className="font-semibold">Connectivity:</h3>
            <pre className="bg-gray-100 p-2 rounded text-black">{JSON.stringify(connectivity, null, 2)}</pre>
          </div>
          <div>
            <h3 className="font-semibold">Boundary:</h3>
            <pre className="bg-gray-100 p-2 rounded text-black">{JSON.stringify(convertBoundaryToCorners(boundary), null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
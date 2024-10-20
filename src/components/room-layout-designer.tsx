"use client"

import React, { useState, useRef, useEffect, MutableRefObject } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import * as d3 from 'd3'
import { Simulation, SimulationNodeDatum } from 'd3-force'
import { ConnectivityGraph } from './connectivity-graph'
import { BoundaryBox } from './boundary-box'

const ROOM_CLASS = {
  "living_room": 1, "kitchen": 2, "bedroom": 3, "bathroom": 4, "balcony": 5, "entrance": 6,
  "dining room": 7, "study room": 8, "storage": 10, "front door": 11, "unknown": 13, "interior_door": 12
}

export function RoomLayoutDesignerComponent() {
  const [rooms, setRooms] = useState<Array<{ id: number, x: number, y: number, type: string, number: string, size: string, name: string }>>([])
  const [connectivity, setConnectivity] = useState<{source: number, target: number, value: number}[]>([])
  const [boundary, setBoundary] = useState<Array<{ x: number, y: number, width: number, height: number }>>([])
  const [currentRoom, setCurrentRoom] = useState({ type: '', number: '', size: '' })
  const connectivitySvgRef = useRef(null)
  const boundaryCanvasRef = useRef(null)
  const simulationRef = useRef(null)

  useEffect(() => {
    drawConnectivity()
  }, [rooms, connectivity, boundary])

  const handleRoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentRoom({ ...currentRoom, [e.target.name]: e.target.value })
  }

  const addRoom = () => {
    if (currentRoom.type && currentRoom.number && currentRoom.size) {
      const newRoom = { 
        ...currentRoom, 
        id: rooms.length, // Ensure unique IDs
        x: Math.random() * 500, 
        y: Math.random() * 500,
        name: `${currentRoom.type} #${currentRoom.number}`
      }
      setRooms(prevRooms => [...prevRooms, newRoom])
      setCurrentRoom({ type: '', number: '', size: '' })
    }
  }

  const drawConnectivity = () => {
    const svg = d3.select(connectivitySvgRef.current);
    svg.selectAll("*").remove(); // Clear previous drawings

    const width = 500;
    const height = 500;

    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation()
        .force("link", d3.forceLink().id((d: any) => d.id).distance(200))
        .force("charge", d3.forceManyBody().strength(-40)) // Adjusted for better spacing
        .force("center", d3.forceCenter(width / 2, height / 2))
    }

    const simulation = simulationRef.current as unknown as Simulation<
      SimulationNodeDatum & { id: number },
      { source: number; target: number; value: number }
    >

    if (!simulation) {
      return
    }

    simulation.nodes(rooms)
    simulation.force("link", d3.forceLink(connectivity).id((d: any) => d.id).distance(150))

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
      .attr("fill", (d: { type: string }) => ROOM_COLORS_DARK[d.type as keyof typeof ROOM_COLORS_DARK])
     
      // Nodes are not draggable now
      // .call(d3.drag() ...)

    // Edge drawing variables
    let isDrawingEdge = false
    let sourceNode: { id: number, x: number, y: number, name: string } | null = null
    let tempEdge: any = null

    // Event handlers for edge creation
    node.on("mousedown", function(event: any, d: any) {
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

        if (targetNode) {
          if (connectivity.find(c => c.source === sourceNode?.id && c.target === targetNode.id)) {  
            // Edge already exists, remove it
            setConnectivity(prevConnectivity => prevConnectivity.filter(c => {
              if (sourceNode) {
                return !(c.source === sourceNode.id && c.target === targetNode.id)
              }
              return false
            }))
          } else {
            setConnectivity(prevConnectivity => {
            if (sourceNode) {
              return [...prevConnectivity, { source: sourceNode.id, target: targetNode.id, value: 1 }]
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
      .text((d: { name: string }) => d.name)
      .attr("font-size", "12px")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .style("pointer-events", "none")
      .attr("dy", ".35em")
      .attr("fill", "black")

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

  function getNodeAtPosition(x: number, y: number, nodes: { id: number, x: number, y: number }[]) {
    return nodes.find(node => Math.abs(node.x - x) < 20 && Math.abs(node.y - y) < 20);
  }

  // Dark mode colors
  const ROOM_COLORS_DARK = {
    "living_room": "#FF6B6B", "kitchen": "#4ECDC4", "bedroom": "#45B7D1", "bathroom": "#66D7D1", 
    "balcony": "#95E1D3", "entrance": "#FCE38A", "dining room": "#F38181", "study room": "#A8D8EA", 
    "storage": "#AA96DA", "front door": "#FCBAD3", "unknown": "#FFFFD2", "interior_door": "#E3FDFD"
  }

  return (
    <div className="p-4 max-w-6xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Room Layout Designer</h1>

      <div className="flex">
        {/* Tabs on the left */}
        <div className="w-1/2">
          <Tabs defaultValue="roomData" orientation="vertical" className="w-full dark">
            <TabsList className="w-full size-full">
              <TabsTrigger value="roomData">Room Data Input</TabsTrigger>
              <TabsTrigger value="roomList">Room List</TabsTrigger>
              <TabsTrigger value="roomConnectivity">Room Connectivity</TabsTrigger>
              <TabsTrigger value="boundaryDrawing">Boundary Drawing</TabsTrigger>
            </TabsList>

            {/* Room Data Input Tab */}
            <TabsContent value="roomData">
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
                <Button className="bg-slate-800 text-white" onClick={addRoom}>Add Room</Button>
              </div>
            </TabsContent>

            {/* Room List Tab */}
            <TabsContent value="roomList">
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
            </TabsContent>

            {/* Room Connectivity Tab */}
            <TabsContent value="roomConnectivity">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Room Connectivity</h2>
                <ConnectivityGraph
                  rooms={rooms}
                  connectivity={connectivity}
                  setConnectivity={setConnectivity}
                />
              </div>
            </TabsContent>

            {/* Boundary Drawing Tab */}
            <TabsContent value="boundaryDrawing">
              <BoundaryBox boundary={boundary} setBoundary={setBoundary} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Data Output on the right */}
        <div className="w-1/2 ml-4">
          <h2 className="text-xl font-semibold mb-2">Data Output</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <h3 className="font-semibold">Rooms:</h3>
              <pre className="bg-slate-700 p-2 rounded text-slate-100">{JSON.stringify(rooms, null, 2)}</pre>
            </div>
            <div>
              <h3 className="font-semibold">Connectivity:</h3>
              <pre className="bg-slate-700 p-2 rounded text-slate-100">{JSON.stringify(connectivity, null, 2)}</pre>
            </div>
            <div>
              <h3 className="font-semibold">Boundary:</h3>
              <pre className="bg-slate-700 p-2 rounded text-slate-100">{JSON.stringify(boundary, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

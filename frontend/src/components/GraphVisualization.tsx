import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Divider
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Download,
  Settings,
  Timeline,
  AccountTree,
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious
} from '@mui/icons-material';
import * as d3 from 'd3';
import { apiService } from '../services/api';
import { VisualizationData, GraphNode, GraphEdge, VisualizationRequest } from '../types/api';
import { useGraph } from '../contexts/GraphContext';

interface GraphVisualizationProps {
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({ onNodeClick, onEdgeClick }) => {
  const { selectedGraph } = useGraph();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [data, setData] = useState<VisualizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  
  // Visualization settings
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<'graph' | 'timeline'>('graph');
  const [layoutType, setLayoutType] = useState<'force' | 'hierarchical' | 'circular'>('force');
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100]);
  const [nodeSize, setNodeSize] = useState(10);
  const [linkDistance, setLinkDistance] = useState(50);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Timeline controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Filters
  const [nodeTypeFilter] = useState<string[]>([]);
  const [edgeTypeFilter] = useState<string[]>([]);
  const [minEdgeWeight, setMinEdgeWeight] = useState(0);

  // D3 refs
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Load visualization data
  const loadVisualizationData = useCallback(async () => {
    if (!selectedGraph) return;

    setLoading(true);
    setError(null);

    try {
      const request: VisualizationRequest = {
        graph_id: selectedGraph.graph_id,
        layout_type: layoutType,
        include_timestamps: viewMode === 'timeline',
        max_nodes: 200,
        min_edge_weight: minEdgeWeight,
        node_types: nodeTypeFilter.length > 0 ? nodeTypeFilter : undefined,
        edge_types: edgeTypeFilter.length > 0 ? edgeTypeFilter : undefined
      };

      const vizData = await apiService.getVisualizationData(request);
      setData(vizData);
      
      // Update time range for timeline mode
      if (viewMode === 'timeline' && vizData.nodes.length > 0) {
        const timestamps = vizData.nodes
          .map(n => new Date(n.created_at).getTime())
          .filter(t => !isNaN(t));
        
        if (timestamps.length > 0) {
          const minTime = Math.min(...timestamps);
          const maxTime = Math.max(...timestamps);
          setTimeRange([minTime, maxTime]);
          setCurrentTime(minTime);
        }
      }

    } catch (err) {
      console.error('Visualization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load visualization data');
    } finally {
      setLoading(false);
    }
  }, [selectedGraph, layoutType, viewMode, minEdgeWeight, nodeTypeFilter, edgeTypeFilter]);

  // Initialize D3 visualization
  const initializeVisualization = useCallback(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // Set up SVG
    svg.attr('width', width).attr('height', height);

    // Create main group for zooming and panning
    const g = svg.append('g').attr('class', 'main-group');

    // Set up zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Filter data based on current settings
    let filteredNodes = data.nodes;
    let filteredEdges = data.edges;

    // Apply timeline filter
    if (viewMode === 'timeline') {
      const currentTimeMs = currentTime;
      filteredNodes = data.nodes.filter(node => {
        const nodeTime = new Date(node.created_at).getTime();
        return nodeTime <= currentTimeMs;
      });
      
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredEdges = data.edges.filter(edge => 
        nodeIds.has(edge.source_id) && nodeIds.has(edge.target_id)
      );
    }

    // Create simulation based on layout type
    let simulation: d3.Simulation<GraphNode, GraphEdge>;

    switch (layoutType) {
      case 'hierarchical':
        simulation = d3.forceSimulation(filteredNodes)
          .force('link', d3.forceLink(filteredEdges).id((d: any) => d.id).distance(linkDistance))
          .force('charge', d3.forceManyBody().strength(-300))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('y', d3.forceY().strength(0.1));
        break;
        
      case 'circular':
        const radius = Math.min(width, height) / 3;
        filteredNodes.forEach((node, i) => {
          const angle = (i / filteredNodes.length) * 2 * Math.PI;
          node.x = width / 2 + radius * Math.cos(angle);
          node.y = height / 2 + radius * Math.sin(angle);
        });
        simulation = d3.forceSimulation(filteredNodes)
          .force('link', d3.forceLink(filteredEdges).id((d: any) => d.id).distance(linkDistance));
        break;
        
      default: // force
        simulation = d3.forceSimulation(filteredNodes)
          .force('link', d3.forceLink(filteredEdges).id((d: any) => d.id).distance(linkDistance))
          .force('charge', d3.forceManyBody().strength(-300))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(nodeSize + 5));
    }

    simulationRef.current = simulation;

    // Create edges
    const links = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(filteredEdges)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: GraphEdge) => Math.sqrt(d.weight || 1) * 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedEdge(d);
        onEdgeClick?.(d);
      });

    // Create nodes
    const nodes = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(filteredNodes)
      .enter().append('circle')
      .attr('r', nodeSize)
      .attr('fill', (d: GraphNode) => getNodeColor(d.node_type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }))
      .on('click', (event, d) => {
        setSelectedNode(d);
        onNodeClick?.(d);
      });

    // Add node labels
    const labels = g.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(filteredNodes)
      .enter().append('text')
      .text((d: GraphNode) => d.name || d.id)
      .attr('font-size', 12)
      .attr('text-anchor', 'middle')
      .attr('dy', nodeSize + 15)
      .style('pointer-events', 'none');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodes
        .attr('cx', (d: GraphNode) => d.x!)
        .attr('cy', (d: GraphNode) => d.y!);

      labels
        .attr('x', (d: GraphNode) => d.x!)
        .attr('y', (d: GraphNode) => d.y!);
    });

  }, [data, viewMode, layoutType, currentTime, nodeSize, linkDistance, onNodeClick, onEdgeClick]);

  // Load data when graph or settings change
  useEffect(() => {
    loadVisualizationData();
  }, [loadVisualizationData]);

  // Initialize visualization when data loads
  useEffect(() => {
    if (data) {
      initializeVisualization();
    }
  }, [data, initializeVisualization]);

  // Timeline animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && viewMode === 'timeline') {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + (timeRange[1] - timeRange[0]) / 100;
          if (next >= timeRange[1]) {
            setIsPlaying(false);
            return timeRange[1];
          }
          return next;
        });
      }, 200);
    }
    
    return () => clearInterval(interval);
  }, [isPlaying, viewMode, timeRange]);

  // Helper functions
  const getNodeColor = (nodeType: string): string => {
    const colors: { [key: string]: string } = {
      'entity': '#1976d2',
      'concept': '#388e3c',
      'event': '#f57c00',
      'person': '#7b1fa2',
      'location': '#d32f2f',
      'organization': '#303f9f',
      'default': '#616161'
    };
    return colors[nodeType] || colors.default;
  };

  const handleZoomIn = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().call(
        zoomRef.current.scaleBy, 1.5
      );
    }
  };

  const handleZoomOut = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().call(
        zoomRef.current.scaleBy, 0.75
      );
    }
  };

  const handleZoomReset = () => {
    if (zoomRef.current && svgRef.current) {
      d3.select(svgRef.current).transition().call(
        zoomRef.current.transform, d3.zoomIdentity
      );
    }
  };

  const exportVisualization = () => {
    if (!svgRef.current) return;
    
    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph_${selectedGraph?.name}_${new Date().toISOString().split('T')[0]}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedGraph) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Select a graph to visualize
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <Paper sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {/* View Mode Toggle */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          size="small"
        >
          <ToggleButton value="graph">
            <AccountTree sx={{ mr: 1 }} /> Graph
          </ToggleButton>
          <ToggleButton value="timeline">
            <Timeline sx={{ mr: 1 }} /> Timeline
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Zoom Controls */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={handleZoomIn}>
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={handleZoomOut}>
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Zoom">
            <IconButton size="small" onClick={handleZoomReset}>
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography variant="caption" sx={{ mx: 1 }}>
          {Math.round(zoomLevel * 100)}%
        </Typography>

        <Divider orientation="vertical" flexItem />

        {/* Timeline Controls */}
        {viewMode === 'timeline' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={() => setCurrentTime(timeRange[0])}>
              <SkipPrevious />
            </IconButton>
            <IconButton size="small" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
            <IconButton size="small" onClick={() => setCurrentTime(timeRange[1])}>
              <SkipNext />
            </IconButton>
          </Box>
        )}

        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
          <Tooltip title="Settings">
            <IconButton size="small" onClick={() => setSettingsOpen(true)}>
              <Settings />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export">
            <IconButton size="small" onClick={exportVisualization}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Timeline Slider */}
      {viewMode === 'timeline' && (
        <Paper sx={{ p: 2, mb: 1 }}>
          <Typography variant="caption" gutterBottom>
            Timeline: {new Date(currentTime).toLocaleDateString()}
          </Typography>
          <Slider
            value={currentTime}
            min={timeRange[0]}
            max={timeRange[1]}
            onChange={(_, value) => setCurrentTime(value as number)}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => new Date(value).toLocaleDateString()}
          />
        </Paper>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Visualization Container */}
      <Paper sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box ref={containerRef} sx={{ width: '100%', height: '100%' }}>
            <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
          </Box>
        )}

        {/* Node/Edge Info Panel */}
        {(selectedNode || selectedEdge) && (
          <Paper
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              p: 2,
              maxWidth: 300,
              zIndex: 1000
            }}
          >
            {selectedNode && (
              <Box>
                <Typography variant="h6">{selectedNode.name || selectedNode.id}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Type: {selectedNode.node_type}
                </Typography>
                {selectedNode.properties && Object.entries(selectedNode.properties).map(([key, value]) => (
                  <Typography key={key} variant="caption" display="block">
                    {key}: {String(value)}
                  </Typography>
                ))}
                <Button
                  size="small"
                  onClick={() => setSelectedNode(null)}
                  sx={{ mt: 1 }}
                >
                  Close
                </Button>
              </Box>
            )}
            
            {selectedEdge && (
              <Box>
                <Typography variant="h6">Edge</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedEdge.source_id} → {selectedEdge.target_id}
                </Typography>
                <Typography variant="body2">
                  Type: {selectedEdge.edge_type}
                </Typography>
                <Typography variant="body2">
                  Weight: {selectedEdge.weight}
                </Typography>
                <Button
                  size="small"
                  onClick={() => setSelectedEdge(null)}
                  sx={{ mt: 1 }}
                >
                  Close
                </Button>
              </Box>
            )}
          </Paper>
        )}
      </Paper>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Visualization Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Layout Type</InputLabel>
              <Select
                value={layoutType}
                onChange={(e) => setLayoutType(e.target.value as any)}
              >
                <MenuItem value="force">Force-directed</MenuItem>
                <MenuItem value="hierarchical">Hierarchical</MenuItem>
                <MenuItem value="circular">Circular</MenuItem>
              </Select>
            </FormControl>

            <Typography gutterBottom sx={{ mt: 3 }}>Node Size: {nodeSize}</Typography>
            <Slider
              value={nodeSize}
              onChange={(_, value) => setNodeSize(value as number)}
              min={5}
              max={25}
              step={1}
            />

            <Typography gutterBottom sx={{ mt: 2 }}>Link Distance: {linkDistance}</Typography>
            <Slider
              value={linkDistance}
              onChange={(_, value) => setLinkDistance(value as number)}
              min={20}
              max={200}
              step={10}
            />

            <Typography gutterBottom sx={{ mt: 2 }}>Min Edge Weight: {minEdgeWeight}</Typography>
            <Slider
              value={minEdgeWeight}
              onChange={(_, value) => setMinEdgeWeight(value as number)}
              min={0}
              max={10}
              step={0.1}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button onClick={() => { setSettingsOpen(false); loadVisualizationData(); }} variant="contained">
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GraphVisualization;

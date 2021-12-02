import * as d3 from 'd3'
import { useRef } from 'react'

export default function Chart() {

  const svgRef = useRef(null)



  return (
    <svg ref={svgRef} />
  )
}
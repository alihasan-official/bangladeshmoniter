declare module '@deck.gl/react' {
  export const DeckGL: any;
  export default DeckGL;
}

declare module '@deck.gl/layers' {
  export const ScatterplotLayer: any;
  export const LineLayer: any;
}

declare module '@turf/turf' {
  export function point(coordinates: number[], properties?: any, options?: any): any;
  export function distance(from: any, to: any, options?: any): number;
}

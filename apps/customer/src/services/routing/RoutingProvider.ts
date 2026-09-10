import { RouteRequest, RouteResult, MatrixRequest, MatrixResult } from '../../types/routing.types';

/**
 * SERVENTICA — Provider Strategy Pattern Interface (SERV-02)
 * Decouples domain routing calculations from specific external engine APIs (OSRM, Mapbox, Google).
 */
export interface RoutingProvider {
  /**
   * Calculates point-to-point road distance and travel duration.
   */
  calculateRoute(request: RouteRequest): Promise<RouteResult>;

  /**
   * Calculates many-to-many travel duration and distance matrix.
   */
  calculateMatrix(request: MatrixRequest): Promise<MatrixResult>;
}

import { create } from 'zustand';
import { createRef, MutableRefObject } from 'react';
import { CityName, PolarCoords, positions } from './coordinates';
import { Mesh } from 'three';
import { cartesianToPolar, EARTH_RADIUS, planarDistance, SCALE_FACTOR, SPHERE_RADIUS, sphericalDistance } from './utils';
import { Route } from './main';

export type Distances = {
  [key in CityName]?: {
    [key in CityName]?: number;
  }
}

export type CityTable = {
  [key in CityName]?: Mesh;
};

export type HoveredCityInfo = {
  name: CityName;
  mesh: Mesh;
}

export type AnimationType = 'fixed' | 'moving' | 'global' | null;

export type Animations = {
  [key in CityName]: AnimationType;
};

export type ContextMenu = {
  cityName: CityName | null;
  mousePosition: [number, number] | null;
  anchor: CityName | null;
  visible: boolean
};

export type Positions = { [key in CityName]?: PolarCoords };


export type Store = {
  route: null | Route
  citiesRef: MutableRefObject<CityTable>;
  hoveredCityRef: MutableRefObject<HoveredCityInfo | null>;
  isDragging: boolean;
  currDistances: Distances;
  animations: Animations;
  contextMenu: ContextMenu;
  isPicking: boolean;
  nCities: number;
  isAnimating: boolean;
  truePositions: Positions;
  nRenderedCities: number;
  controlsEnabled: boolean;
  moveLock: boolean;
  updateRoute: (route: Route) => void;
  updateCurrDistances: () => void;
  updateCities: (name: CityName, city: Mesh, remove?: boolean) => void;
  updateHoveredCity: (name: CityName | null) => void;
  moveHoveredCity: (x: number, y: number, z: number, lock?: boolean) => void;
  updateIsDragging: (isDragging: boolean) => void;
  updateAnimationState: (status: AnimationType, cityName?: CityName) => boolean;
  updateContextMenu: (menu: ContextMenu) => void;
  updateIsPicking: (isPicking: boolean) => void;
  updateNCities: (nCities: number) => void;
  updateIsAnimating: (isAnimating: boolean) => void;
  reset: () => void;
  updateControlsEnabled: (controlsEnabled: boolean) => void;
  updateMoveLock: (moveLock: boolean) => void;
}

const fillAnimationTable = (val: AnimationType) => Object.keys(positions).reduce((obj, key) => ({ ...obj, [key as CityName]: val }), {}) as Animations;


const calculateDistancesPlane = (cities: CityTable) => {
  const currDistaces: Distances = {};
  for (const [cityName1, cityMesh1] of Object.entries(cities) as [CityName, Mesh][]) {
    for (const [cityName2, cityMesh2] of Object.entries(cities) as [CityName, Mesh][]) {
      const distance = planarDistance(cityMesh1, cityMesh2) * SCALE_FACTOR;
      if (currDistaces[cityName1] === undefined) currDistaces[cityName1] = {};
      if (currDistaces[cityName2] === undefined) currDistaces[cityName2] = {};
      currDistaces[cityName1][cityName2] = distance;
      currDistaces[cityName2][cityName1] = distance;
    }
  }
  return currDistaces;
}


const calculateDistancesSphere = (cities: CityTable) => {
  const currDistaces: Distances = {};
  for (const [cityName1, cityMesh1] of Object.entries(cities) as [CityName, Mesh][]) {
    for (const [cityName2, cityMesh2] of Object.entries(cities) as [CityName, Mesh][]) {
      const p1 = cartesianToPolar(cityMesh1.position, SPHERE_RADIUS);
      const p2 = cartesianToPolar(cityMesh2.position, SPHERE_RADIUS);
      const distance = sphericalDistance(p1, p2, EARTH_RADIUS); //compute distances as if on the earth
      if (currDistaces[cityName1] === undefined) currDistaces[cityName1] = {};
      if (currDistaces[cityName2] === undefined) currDistaces[cityName2] = {};
      currDistaces[cityName1][cityName2] = distance;
      currDistaces[cityName2][cityName1] = distance;
    }
  }
  return currDistaces;
}

const currDistances = {};
const isDragging = false;
const citiesRef = createRef() as MutableRefObject<CityTable>;
const hoveredCityRef = createRef() as MutableRefObject<HoveredCityInfo | null>;
const animations = fillAnimationTable(null);
const contextMenu: ContextMenu = { cityName: null, anchor: null, mousePosition: null, visible: false };
const isPicking = false;
const isAnimating = false;
const nCities = 7;
const updateCurrDistances = () => { throw new Error('route not set properly') };
const route = null;
const truePositions = {};
const nRenderedCities = 0;
const controls = true;
const moveLock = false;

citiesRef.current = {};

export const useStore = create<Store>((set, get) => ({
  route,
  citiesRef,
  hoveredCityRef,
  isDragging,
  currDistances,
  animations,
  contextMenu,
  isPicking,
  nCities,
  isAnimating,
  nRenderedCities,
  truePositions: truePositions,
  controlsEnabled: controls,
  moveLock: moveLock,
  updateMoveLock: (moveLock: boolean) => set({ moveLock }),
  reset: () => {
    // get().citiesRef.current = {};
    get().hoveredCityRef.current = null;
    get().updateIsDragging(isDragging);
    get().updateAnimationState(null);
    set({ isAnimating, isDragging, contextMenu, route, nCities, truePositions })
  },
  updateRoute: (route: Route) => {
    get().reset();
    get().citiesRef.current = {};

    const calculateDistances = (route === 'sphere') ? calculateDistancesSphere : calculateDistancesPlane;
    const updateCurrDistances = () => {
      const cities = get().citiesRef.current;
      if (!cities) return;
      set({ currDistances: calculateDistances(cities) });
    }
    set({ updateCurrDistances, route, nRenderedCities });
  },
  updateCurrDistances,
  updateCities: (name: CityName, city: Mesh, remove: boolean = false) => {
    const cities = get().citiesRef.current;
    if (remove === true) {
      if (cities[name] === undefined) return;
      delete cities[name];
      set(state => ({ nRenderedCities: state.nRenderedCities - 1 }))
    } else {
      cities[name] = city;
      set(state => ({ nRenderedCities: state.nRenderedCities + 1 }))
    }
    get().updateCurrDistances();
  },
  updateHoveredCity: (name: CityName | null) => {
    if (name === null) {
      get().hoveredCityRef.current = null;
      return;
    }
    const mesh = get().citiesRef.current[name];
    if (mesh === undefined) throw new Error("invalid city name");
    get().hoveredCityRef.current = { name, mesh };
  },

  moveHoveredCity: (x: number, y: number, z: number, lock?: boolean) => {
    if (get().moveLock === true && lock !== false) return;
    const hoveredCity = get().hoveredCityRef.current;
    if (hoveredCity === null)
      throw new Error("Trying to move without selecting a city");
    hoveredCity.mesh.position.set(x, y, z);
    get().updateCurrDistances();
    if (lock !== undefined) {
      set({ moveLock: lock })
    }
  },
  updateIsDragging: (isDragging: boolean) => set({ isDragging }),
  updateAnimationState: (status: AnimationType, cityName?: CityName) => {
    if (status !== null && Object.values(get().animations).find(animation => animation === null) === undefined)
      return false;
    if (cityName === undefined) {
      set({ animations: fillAnimationTable(status) });
      return true;
    }
    if (status === 'fixed') {
      const animations = fillAnimationTable('moving');
      animations[cityName] = 'fixed';
      set({ animations });
      return true;
    }
    set((state) => ({ animations: { ...state.animations, [cityName]: status } }));

    return true;
  },
  updateContextMenu: (menu: ContextMenu) => set({ contextMenu: menu }),
  updateIsPicking: (isPicking: boolean) => set({ isPicking }),
  updateNCities: (nCities: number) => {
    get().reset();
    set({ nCities });
    const n = nCities;
    if (n === undefined) return positions;
    const keys = Object.keys(positions) as CityName[];
    const truePositions: { [key in CityName]?: PolarCoords } = {};
    for (let i = 0; i < n; i++) {
      const key = keys[i];
      truePositions[key] = positions[key];
    }
    set({ truePositions });
  },
  updateIsAnimating: (isAnimating: boolean) => set({ isAnimating }),
  updateControlsEnabled: (controlsEnabled: boolean) => set({ controlsEnabled })
}));

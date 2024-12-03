import { Line, PerspectiveCamera } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { forwardRef, useMemo } from "react";
import { Mesh, TextureLoader, Vector3 } from "three";
import { CIRCLE_RADIUS } from "../utils";
import { Cities } from "../components/Cities";
import { Curves } from "../components/Curves";
import { EarthProps, EarthWrapper } from "../components/Earth";
import { Controls } from "../components/Controls";
import { Stars } from "../components/Stars";
import { Sprites } from "../components/TextSprite";
import { ContextMenu } from "../components/ContextMenu";
import { AboutMenu, RealDistancesContainer, TotalError, UIContainer } from "../components/UI";
import { Distances } from "../components/Distances";
import CustomCanvas from "../components/CustomCanvas";
import useSetupSection from "../hooks/useSetupSection";

const ROTATION: [number, number, number] = [-Math.PI / 2, 0, -Math.PI / 2];

export default function Plane() {
  useSetupSection(4, 'plane');
  return (
    <>
      <CustomCanvas className="bg-black">
        <PerspectiveCamera makeDefault position={[10, 10, 0]} />
        <Controls />
        <ambientLight color={0xffffff} intensity={2} />
        <Cities />
        <EarthWrapper EarthMesh={EarthMesh} />
        <EarthWireframe />
        <Stars />
        <Curves />
        <Sprites />
      </CustomCanvas>
      <UIContainer>
        <div className="w-full flex justify-center z-0">
          <TotalError />
        </div>
        <div className="top-0 left-0 fixed w-full h-full z-10 pointer-events-none">
          <div className="flex w-full h-full flex-col justify-end">
            <div className="flex justify-end w-full">
              <AboutMenu />
            </div>
          </div>
        </div>
        <RealDistancesContainer />
        <Distances />
        <ContextMenu />
      </UIContainer>
    </>
  );
}


const EarthMesh = forwardRef<Mesh, EarthProps>(({ onPointerMove, onPointerUp }, ref) => {
  const texture = useLoader(TextureLoader, '/img/disk.png');
  return (
    <mesh rotation={ROTATION} receiveShadow={true} position={[0, -0.05, 0]}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      ref={ref}>
      <circleGeometry args={[CIRCLE_RADIUS, 64]} />
      <meshStandardMaterial map={texture} toneMapped={false} />
    </mesh>
  );
});

function EarthWireframe() {
  const wireframe = [];
  for (let amplitude = 0; amplitude < CIRCLE_RADIUS; amplitude += 10) {
    wireframe.push(<CircleWire amplitude={amplitude} key={amplitude} />);
  }
  return (
    <>
      {wireframe}
      <mesh rotation={ROTATION} receiveShadow={true} position={[0, -0.05, 0]}>
        <circleGeometry args={[CIRCLE_RADIUS, 32]} />
        <meshBasicMaterial color={"gray"} wireframe />
      </mesh>
    </>
  );
}

function CircleWire({ amplitude = CIRCLE_RADIUS, resolution = 90 }: { amplitude?: number, resolution?: number }) {
  const points = useMemo(() => {
    const size = 360 / resolution;
    return Array.from({ length: resolution + 1 }, (_, i) => {
      const segment = (i * size) * Math.PI / 180;
      return new Vector3(Math.cos(segment) * amplitude, 0, Math.sin(segment) * amplitude);
    });
  }, [amplitude, resolution]);
  return (
    <Line points={points} color={"grey"} linewidth={1} />
  );
}

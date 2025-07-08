"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/components/circuit/core/BaseElement";
import { useEffect, useState } from "react";
import { Image } from "react-konva";

interface BatteryProps extends BaseElementProps {}

export default function Battery(props: BatteryProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "/circuit_elements/battery.svg";
    image.onload = () => setImg(image);
  }, []);

  return (
    <BaseElement {...props}>
      {img && (
        <Image
          image={img}
          width={40}
          height={40}
          shadowColor={props.selected ? "blue" : undefined}
          shadowBlur={props.selected ? 15 : 0}
          shadowOffset={{ x: 0, y: 0 }}
          shadowOpacity={props.selected ? 0.6 : 0}
        />
      )}
    </BaseElement>
  );
}

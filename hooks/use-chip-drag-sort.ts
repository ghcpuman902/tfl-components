"use client"

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"

const DRAG_THRESHOLD_PX = 6

export type ChipDragGhost<Id> = {
  id: Id
  x: number
  y: number
  width: number
  offsetX: number
  offsetY: number
}

type ChipDragSession<Id, Zone> = {
  id: Id
  from: Zone
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  width: number
  active: boolean
}

type UseChipDragSortOptions<Id extends string, Zone extends string> = {
  zones: readonly Zone[]
  itemsInZone: (zone: Zone) => readonly Id[]
  onDrop: (id: Id, to: Zone, index?: number) => void
  onClick?: (id: Id, from: Zone) => void
}

const insertIndexFromPoint = (
  x: number,
  y: number,
  chipEls: readonly (HTMLElement | null)[]
): number => {
  for (let index = 0; index < chipEls.length; index++) {
    const el = chipEls[index]
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (y >= rect.top && y <= rect.bottom && x < rect.left + rect.width / 2) {
      return index
    }
    if (y < rect.top) return index
  }
  return chipEls.length
}

export const useChipDragSort = <Id extends string, Zone extends string>({
  zones,
  itemsInZone,
  onDrop,
  onClick,
}: UseChipDragSortOptions<Id, Zone>) => {
  const zoneRefs = useRef<Partial<Record<Zone, HTMLElement | null>>>({})
  const chipRefs = useRef<Partial<Record<Id, HTMLElement | null>>>({})
  const sessionRef = useRef<ChipDragSession<Id, Zone> | null>(null)
  const itemsInZoneRef = useRef(itemsInZone)
  const onDropRef = useRef(onDrop)
  const onClickRef = useRef(onClick)

  useEffect(() => {
    itemsInZoneRef.current = itemsInZone
    onDropRef.current = onDrop
    onClickRef.current = onClick
  })

  const [activeId, setActiveId] = useState<Id | null>(null)
  const [overZone, setOverZone] = useState<Zone | null>(null)
  const [insertIndex, setInsertIndex] = useState<number | null>(null)
  const [ghost, setGhost] = useState<ChipDragGhost<Id> | null>(null)

  const zoneFromPoint = (x: number, y: number): Zone | null => {
    for (const zone of zones) {
      const el = zoneRefs.current[zone]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        return zone
      }
    }
    return null
  }

  const dropFromPoint = (
    x: number,
    y: number,
    dragging: Id
  ): { zone: Zone; index: number } | null => {
    const zone = zoneFromPoint(x, y)
    if (!zone) return null
    const stack = itemsInZoneRef
      .current(zone)
      .filter((item) => item !== dragging)
    const chipEls = stack.map((item) => chipRefs.current[item] ?? null)
    return { zone, index: insertIndexFromPoint(x, y, chipEls) }
  }

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: Id,
    from: Zone
  ) => {
    if (event.button !== 0) return
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    target.setPointerCapture(event.pointerId)
    sessionRef.current = {
      id,
      from,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      active: false,
    }

    const handleMove = (moveEvent: PointerEvent) => {
      const session = sessionRef.current
      if (!session || moveEvent.pointerId !== session.pointerId) return
      const dx = moveEvent.clientX - session.startX
      const dy = moveEvent.clientY - session.startY
      if (
        !session.active &&
        dx * dx + dy * dy >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX
      ) {
        session.active = true
        setActiveId(session.id)
      }
      if (!session.active) return
      setGhost({
        id: session.id,
        x: moveEvent.clientX,
        y: moveEvent.clientY,
        width: session.width,
        offsetX: session.offsetX,
        offsetY: session.offsetY,
      })
      const drop = dropFromPoint(
        moveEvent.clientX,
        moveEvent.clientY,
        session.id
      )
      setOverZone(drop?.zone ?? null)
      setInsertIndex(drop?.index ?? null)
    }

    const handleUp = (upEvent: PointerEvent) => {
      const session = sessionRef.current
      if (!session || upEvent.pointerId !== session.pointerId) return
      if (target.hasPointerCapture(upEvent.pointerId)) {
        target.releasePointerCapture(upEvent.pointerId)
      }
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      window.removeEventListener("pointercancel", handleUp)
      sessionRef.current = null
      setActiveId(null)
      setOverZone(null)
      setInsertIndex(null)
      setGhost(null)

      if (session.active) {
        const drop = dropFromPoint(
          upEvent.clientX,
          upEvent.clientY,
          session.id
        )
        if (drop) onDropRef.current(session.id, drop.zone, drop.index)
        return
      }
      onClickRef.current?.(session.id, session.from)
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    window.addEventListener("pointercancel", handleUp)
  }

  const zoneRef = (zone: Zone) => (node: HTMLElement | null) => {
    zoneRefs.current[zone] = node
  }

  const chipRef = (id: Id) => (node: HTMLElement | null) => {
    chipRefs.current[id] = node
  }

  return {
    activeId,
    overZone,
    insertIndex,
    ghost,
    handlePointerDown,
    zoneRef,
    chipRef,
  }
}

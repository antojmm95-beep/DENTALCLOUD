import React from 'react';
import { ToothClinicalStatus, ToothSurface, ToothCondition } from '../types/dental';

interface OdontogramToothProps {
  number: number;
  condition?: ToothCondition;
  isSelected: boolean;
  isBatchSelected?: boolean;
  onSelect: (number: number) => void;
  onSurfaceClick: (number: number, surface: ToothSurface) => void;
  isUpper: boolean;
  onStatusChange?: (number: number, status: 'pendiente' | 'en_tratamiento' | 'finalizado') => void;
}

export const OdontogramTooth: React.FC<OdontogramToothProps> = ({
  number,
  condition,
  isSelected,
  isBatchSelected = false,
  onSelect,
  onSurfaceClick,
  isUpper,
  onStatusChange
}) => {
  const wholeStatus = condition?.wholeStatus;
  const surfaces = condition?.surfaces || {};
  const statusSequence = condition?.statusSequence || 'pendiente';

  // Specific Legend Color Rules:
  // - Caries: Rojo (#EF4444)
  // - Ausencias: Azul (#2563EB)
  // - Restauraciones en buen estado: Azul (#2563EB)
  // - Indicado para extracción: X Roja (#EF4444)
  // - Implante: Azul con tornillito (#2563EB)
  // - Necesidad de Implante: Rojo con tornillito (#EF4444)
  // - Endodoncia: Raya vertical roja (#EF4444)
  // - Corona: Toda la cara pintada de azul (#2563EB)

  const getSurfaceColor = (surface: ToothSurface) => {
    if (wholeStatus === 'corona') return '#2563EB'; // Corona: toda la cara pintada de azul
    if (wholeStatus === 'ausente') return '#DBEAFE';
    if (wholeStatus === 'obturado') return '#2563EB';
    if (wholeStatus === 'caries') return '#EF4444';

    const surfStatus = surfaces[surface];
    if (surfStatus === 'caries') return '#EF4444'; // Caries rojo
    if (surfStatus === 'obturado') return '#2563EB'; // Restauración buen estado azul
    if (surfStatus === 'ausente') return '#DBEAFE';
    if (surfStatus === 'corona') return '#2563EB';
    return '#FFFFFF';
  };

  const getSurfaceStroke = (surface: ToothSurface) => {
    if (wholeStatus === 'corona') return '#1D4ED8';
    if (wholeStatus === 'caries') return '#B91C1C';
    if (wholeStatus === 'obturado') return '#1D4ED8';
    
    const surfStatus = surfaces[surface];
    if (surfStatus === 'caries') return '#B91C1C';
    if (surfStatus === 'obturado') return '#1D4ED8';
    return '#94A3B8';
  };

  // Surface orientation
  const topSurface: ToothSurface = isUpper ? 'V' : 'L';
  const bottomSurface: ToothSurface = isUpper ? 'L' : 'V';
  
  const isRightSideOfFace = [18,17,16,15,14,13,12,11, 48,47,46,45,44,43,42,41, 55,54,53,52,51, 85,84,83,82,81].includes(number);
  const leftSurface: ToothSurface = isRightSideOfFace ? 'D' : 'M';
  const rightSurface: ToothSurface = isRightSideOfFace ? 'M' : 'D';

  const isMissing = wholeStatus === 'ausente';
  const isExtraction = wholeStatus === 'extraccion_indicada';
  const hasEndo = wholeStatus === 'endodoncia' || surfaces.O === 'endodoncia';
  const hasImplantBlue = wholeStatus === 'implante';
  const hasImplantRed = wholeStatus === 'necesidad_implante';
  const hasCrown = wholeStatus === 'corona';

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onStatusChange) return;
    const nextStatus = statusSequence === 'pendiente' 
      ? 'en_tratamiento' 
      : statusSequence === 'en_tratamiento' 
        ? 'finalizado' 
        : 'pendiente';
    onStatusChange(number, nextStatus);
  };

  return (
    <div 
      data-tooth={number}
      className={`flex flex-col items-center p-0.5 rounded-lg transition-all duration-150 select-none cursor-pointer ${
        isBatchSelected
          ? 'bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500 shadow-sm'
          : isSelected 
            ? 'bg-sky-50 dark:bg-sky-950/50 ring-2 ring-sky-500 shadow-sm' 
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
      }`}
      onClick={() => onSelect(number)}
    >
      {/* Top Number indicator for upper teeth */}
      {isUpper && (
        <span 
          className={`text-[10px] font-mono font-bold mb-0.5 px-1 rounded cursor-pointer ${
            isBatchSelected
              ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60'
              : isSelected 
                ? 'text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60' 
                : 'text-slate-600 dark:text-slate-400 hover:text-sky-600'
          }`}
        >
          {number}
        </span>
      )}

      {/* Interactive 5-Surface Tooth SVG */}
      <div className="relative group cursor-pointer">
        <svg 
          viewBox="0 0 60 60" 
          className="w-6 h-6 xl:w-7 xl:h-7 drop-shadow-xs transition-transform hover:scale-105"
        >
          {/* Top polygon (Vestibular/Lingual) */}
          <polygon
            points="5,5 55,5 42,18 18,18"
            fill={getSurfaceColor(topSurface)}
            stroke={getSurfaceStroke(topSurface)}
            strokeWidth="1.5"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick(number, topSurface);
            }}
          />

          {/* Bottom polygon (Lingual/Vestibular) */}
          <polygon
            points="18,42 42,42 55,55 5,55"
            fill={getSurfaceColor(bottomSurface)}
            stroke={getSurfaceStroke(bottomSurface)}
            strokeWidth="1.5"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick(number, bottomSurface);
            }}
          />

          {/* Left polygon */}
          <polygon
            points="5,5 18,18 18,42 5,55"
            fill={getSurfaceColor(leftSurface)}
            stroke={getSurfaceStroke(leftSurface)}
            strokeWidth="1.5"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick(number, leftSurface);
            }}
          />

          {/* Right polygon */}
          <polygon
            points="55,5 55,55 42,42 42,18"
            fill={getSurfaceColor(rightSurface)}
            stroke={getSurfaceStroke(rightSurface)}
            strokeWidth="1.5"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick(number, rightSurface);
            }}
          />

          {/* Center (Oclusal / Incisal) */}
          <rect
            x="18"
            y="18"
            width="24"
            height="24"
            fill={getSurfaceColor('O')}
            stroke={getSurfaceStroke('O')}
            strokeWidth="1.5"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick(number, 'O');
            }}
          />

          {/* Ausencias: Cruz Azul */}
          {isMissing && (
            <g stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round">
              <line x1="8" y1="8" x2="52" y2="52" />
              <line x1="52" y1="8" x2="8" y2="52" />
            </g>
          )}

          {/* Indicado para Extracción: X Roja */}
          {isExtraction && (
            <g stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="54" y2="54" />
              <line x1="54" y1="6" x2="6" y2="54" />
            </g>
          )}

          {/* Endodoncia: Una raya roja central vertical */}
          {hasEndo && (
            <g stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round">
              <line x1="30" y1="6" x2="30" y2="54" />
            </g>
          )}

          {/* Implante: Azul con un tornillito */}
          {hasImplantBlue && (
            <g stroke="#2563EB" strokeWidth="2" strokeLinecap="round">
              <line x1="20" y1="28" x2="40" y2="28" />
              <line x1="22" y1="36" x2="38" y2="36" />
              <line x1="25" y1="44" x2="35" y2="44" />
              <line x1="30" y1="16" x2="30" y2="52" strokeWidth="2.5" />
            </g>
          )}

          {/* Necesidad de colocar Implante: Rojo con un tornillito */}
          {hasImplantRed && (
            <g stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
              <line x1="20" y1="28" x2="40" y2="28" />
              <line x1="22" y1="36" x2="38" y2="36" />
              <line x1="25" y1="44" x2="35" y2="44" />
              <line x1="30" y1="16" x2="30" y2="52" strokeWidth="2.5" />
            </g>
          )}

          {/* Corona: toda la cara pintada de azul (ya cubierta) + borde reforzado */}
          {hasCrown && (
            <rect
              x="5"
              y="5"
              width="50"
              height="50"
              fill="#2563EB"
              fillOpacity="0.4"
              stroke="#1D4ED8"
              strokeWidth="2"
              pointerEvents="none"
            />
          )}
        </svg>
      </div>

      {/* Bottom Number indicator for lower teeth */}
      {!isUpper && (
        <span 
          className={`text-[10px] font-mono font-bold mt-0.5 px-1 rounded cursor-pointer ${
            isSelected 
              ? 'text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60' 
              : 'text-slate-600 dark:text-slate-400 hover:text-sky-600'
          }`}
        >
          {number}
        </span>
      )}

      {/* Estatus colocado en la parte inferior en cada diente vinculado a la secuencia de tratamiento */}
      <button
        type="button"
        onClick={cycleStatus}
        className={`mt-0.5 w-full max-w-[42px] px-0.5 py-0.5 rounded text-[7.5px] leading-tight font-bold tracking-tight uppercase truncate transition-all shadow-2xs ${
          statusSequence === 'finalizado'
            ? 'bg-emerald-600 text-white'
            : statusSequence === 'en_tratamiento'
              ? 'bg-sky-600 text-white'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
        }`}
        title={`Estatus de la pieza ${number}: ${statusSequence}. Clic para alternar (Pendiente -> En Tto -> Finalizado).`}
      >
        {statusSequence === 'finalizado' ? 'Final.' : statusSequence === 'en_tratamiento' ? 'En Tto.' : 'Pend.'}
      </button>

    </div>
  );
};

import React, { useState } from 'react';
import { useDental } from '../context/DentalContext';
import { EquipmentItem, DescartableProduct } from '../types/dental';
import { INITIAL_DESCARTABLES } from '../data/mockData';
import { 
  TrendingUp, 
  Cpu, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  Plus, 
  Calculator, 
  Layers, 
  Sparkles, 
  Database, 
  HelpCircle,
  Package,
  CheckSquare,
  Square,
  Search,
  ShoppingCart
} from 'lucide-react';

export const RendimientoView: React.FC = () => {
  const { 
    equipment, 
    addEquipment, 
    expenses, 
    exchangeRate, 
    showToast 
  } = useDental();

  // Tab: 'costo_sillon' | 'descartables' | 'depreciacion'
  const [activeTab, setActiveTab] = useState<'costo_sillon' | 'descartables' | 'depreciacion'>('costo_sillon');

  // Calculator params
  const [monthlyHours, setMonthlyHours] = useState<number>(160); // 8 hours x 20 working days
  const [numberOfChairs, setNumberOfChairs] = useState<number>(3); // Consultorio 1, 2, 3
  
  // Simulator params
  const [simDurationMinutes, setSimDurationMinutes] = useState<number>(45);
  const [simMaterialCost, setSimMaterialCost] = useState<number>(12);
  const [simTargetProfitMargin, setSimTargetProfitMargin] = useState<number>(50); // %

  // Descartables State (Insumos directos)
  const [descartablesList, setDescartablesList] = useState<DescartableProduct[]>(INITIAL_DESCARTABLES);
  const [searchDescartable, setSearchDescartable] = useState<string>('');
  const [selectedItemsForProcedure, setSelectedItemsForProcedure] = useState<Record<string, number>>({
    'desc-1': 1, // Anestesia Lidocaína
    'desc-3': 1, // Aguja corta
    'desc-5': 1, // Resina Z350
    'desc-6': 1, // Adhesivo
    'desc-7': 1, // Ácido grabador
    'desc-8': 1, // Dique de goma
    'desc-10': 1, // Eyector saliva
    'desc-11': 1, // Babero
    'desc-12': 1, // Guantes nitrilo
  });

  // New Equipment Form State
  const [showAddEquipment, setShowAddEquipment] = useState<boolean>(false);
  const [eqName, setEqName] = useState<string>('');
  const [eqCategory, setEqCategory] = useState<EquipmentItem['category']>('unidad_dental');
  const [eqPrice, setEqPrice] = useState<number>(3500);
  const [eqYears, setEqYears] = useState<number>(5);

  // Financial calculations (Rentabilidad y Costo Hora-Sillón)
  const monthlyFixedExpenses = expenses.reduce((acc, curr) => acc + curr.amountUsd, 0);
  const totalEquipmentDepreciationMonthly = equipment.reduce((acc, curr) => acc + curr.monthlyDepreciationUsd, 0);
  
  const totalOperatingCostPerMonth = monthlyFixedExpenses + totalEquipmentDepreciationMonthly;
  const clinicCostPerHour = totalOperatingCostPerMonth / monthlyHours;
  const chairCostPerHour = clinicCostPerHour / (numberOfChairs || 1);
  const chairCostPerMinute = chairCostPerHour / 60;

  // Simulator calculations
  const simChairCost = chairCostPerMinute * simDurationMinutes;
  const simTotalDirectCost = simChairCost + simMaterialCost;
  const simSuggestedPrice = simTotalDirectCost / (1 - (simTargetProfitMargin / 100));

  const handleAddEquipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName || eqPrice <= 0 || eqYears <= 0) return;

    addEquipment({
      name: eqName,
      category: eqCategory,
      purchasePriceUsd: eqPrice,
      purchaseDate: new Date().toISOString().split('T')[0],
      usefulLifeYears: eqYears
    });

    setEqName('');
    setEqPrice(3500);
    setEqYears(5);
    setShowAddEquipment(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner Rentabilidad */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-blue-900 text-white rounded-2xl p-6 shadow-md border border-sky-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black tracking-widest uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30 rounded">
              RENTABILIDAD Y COSTEO CLÍNICO
            </span>
            <span className="text-xs text-sky-200">· Rentabilidad y Depreciación</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight mt-1">
            Rendimiento Clínico & Costo Hora-Sillón
          </h1>
          <p className="text-xs text-sky-200/80 max-w-2xl mt-1">
            Fórmula matemática de costeo: Depreciación de activos tecnológicos + Gastos fijos operativos / Horas productivas en Consultorio 1, 2 y 3.
          </p>
        </div>

        {/* Navigation tabs within module */}
        <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('costo_sillon')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'costo_sillon' 
                ? 'bg-sky-500 text-white shadow-xs' 
                : 'text-sky-200 hover:text-white hover:bg-white/5'
            }`}
          >
            Costo Hora-Sillón
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('descartables')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'descartables' 
                ? 'bg-sky-500 text-white shadow-xs' 
                : 'text-sky-200 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Inventario Descartables</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('depreciacion')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'depreciacion' 
                ? 'bg-sky-500 text-white shadow-xs' 
                : 'text-sky-200 hover:text-white hover:bg-white/5'
            }`}
          >
            Depreciación Equipos
          </button>
        </div>
      </div>

      {/* TAB 1: COSTO HORA-SILLÓN */}
      {activeTab === 'costo_sillon' && (
        <div className="space-y-6">
          
          {/* Key Metric Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Costo Minuto */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Costo Operativo por Minuto</span>
                <Clock className="w-4 h-4 text-sky-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-sky-600 dark:text-sky-400 font-mono tabular-nums">
                ${chairCostPerMinute.toFixed(2)} USD/min
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                ≈ Bs. {(chairCostPerMinute * exchangeRate).toFixed(2)} / minuto
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                Por cada sillón activo (1, 2 o 3)
              </div>
            </div>

            {/* Costo Hora */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Costo Hora-Sillón</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                ${chairCostPerHour.toFixed(2)} USD/hora
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                ≈ Bs. {(chairCostPerHour * exchangeRate).toFixed(2)} / hora
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                Base: {monthlyHours} horas productivas/mes
              </div>
            </div>

            {/* Costo Fijo Mensual */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Gastos Fijos + Depreciación</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
                ${totalOperatingCostPerMonth.toFixed(2)} USD
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Fijo: ${monthlyFixedExpenses.toFixed(0)} | Deprec: ${totalEquipmentDepreciationMonthly.toFixed(0)}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                Gasto global de Clínica Corona
              </div>
            </div>

            {/* Sillones Asignados */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Capacidad Instalada</span>
                <Cpu className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {numberOfChairs} Consultorios
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Consultorio 1, 2 y 3
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                {monthlyHours * numberOfChairs} horas sillón totales/mes
              </div>
            </div>

          </div>

          {/* SIMULADOR DE PRESUPUESTO & PRECIO MÍNIMO DE TRATAMIENTO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Input parameters */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-sky-600" />
                  <span>Calculadora de Rentabilidad por Tratamiento</span>
                </h3>
                <span className="text-[11px] font-mono text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded">
                  Costeo Clínico
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Duración Estimada en Sillón (minutos):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="15"
                      max="180"
                      step="5"
                      value={simDurationMinutes}
                      onChange={(e) => setSimDurationMinutes(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-16 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-center font-mono font-bold text-slate-900 dark:text-white">
                      {simDurationMinutes} min
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Costo de Materiales / Insumos Dentales ($ USD):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={simMaterialCost}
                    onChange={(e) => setSimMaterialCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg outline-none font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Resina, fresas, anestesia, baberos, eyector, etc.
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Margen de Ganancia Objetivo (%):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="5"
                      value={simTargetProfitMargin}
                      onChange={(e) => setSimTargetProfitMargin(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-16 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-center font-mono font-bold text-emerald-600">
                      {simTargetProfitMargin}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results breakdown */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-slate-800/80 dark:to-slate-900 border border-sky-100 dark:border-sky-900/40 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                  Desglose de Costos & Precio Mínimo Recomendado
                </span>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-sky-200/60 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">Costo de Tiempo en Sillón ({simDurationMinutes} min):</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">${simChairCost.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-sky-200/60 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">Costo de Insumos / Materiales:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">${simMaterialCost.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-sky-200/60 dark:border-slate-700">
                    <span className="text-slate-700 dark:text-slate-300 font-bold">Costo Real Directo (Punto de Equilibrio):</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">${simTotalDirectCost.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-xl border border-sky-200 dark:border-slate-700">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Precio de Venta Mínimo Sugerido ({simTargetProfitMargin}% utilidad):
                </div>
                <div className="text-3xl font-black text-sky-700 dark:text-sky-300 font-mono mt-1">
                  ${simSuggestedPrice.toFixed(2)} USD
                </div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">
                  ≈ Bs. {(simSuggestedPrice * exchangeRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: DEPRECIACIÓN DE EQUIPOS */}
      {activeTab === 'depreciacion' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-600" />
                <span>Inventario & Depreciación de Equipos Odontológicos</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cálculo de alícuota mensual y por hora para reponer el equipamiento al vencer su vida útil.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddEquipment(true)}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Equipo</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="p-3">Equipo / Activo</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Fecha Compra</th>
                  <th className="p-3 text-right">Precio Compra ($)</th>
                  <th className="p-3 text-center">Vida Útil</th>
                  <th className="p-3 text-right">Deprec. Mensual ($)</th>
                  <th className="p-3 text-right">Deprec. Hora ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {equipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-semibold">{eq.name}</td>
                    <td className="p-3 text-slate-500 uppercase text-[10px] font-bold">{eq.category.replace('_', ' ')}</td>
                    <td className="p-3 font-mono text-[11px]">{eq.purchaseDate}</td>
                    <td className="p-3 text-right font-mono font-bold">${eq.purchasePriceUsd.toFixed(2)}</td>
                    <td className="p-3 text-center font-bold text-sky-600">{eq.usefulLifeYears} años</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-600">${eq.monthlyDepreciationUsd.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">${eq.hourlyDepreciationUsd.toFixed(2)}/h</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={5} className="p-3 text-right uppercase text-[11px]">Total Depreciación de Equipos:</td>
                  <td className="p-3 text-right font-mono font-black text-amber-600 text-sm">
                    ${totalEquipmentDepreciationMonthly.toFixed(2)}/mes
                  </td>
                  <td className="p-3 text-right font-mono font-black text-emerald-600 text-sm">
                    ${(totalEquipmentDepreciationMonthly / monthlyHours).toFixed(2)}/h
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTARIO DE INSUMOS & LO DESCARTABLE */}
      {activeTab === 'descartables' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-600" />
                  <span>Catálogo de Insumos & Lo Descartable</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Costeo de precisión quirúrgica: calcule el gasto real de materiales por cárpule, jeringa, hoja de dique y aplicación clínica.
                </p>
              </div>

              {/* Procedure preset quick buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">Plantilla:</span>
                <button
                  type="button"
                  onClick={() => setSelectedItemsForProcedure({
                    'desc-1': 1, 'desc-3': 1, 'desc-5': 1, 'desc-6': 1, 'desc-7': 1, 'desc-8': 1, 'desc-10': 1, 'desc-11': 1, 'desc-12': 1, 'desc-19': 1
                  })}
                  className="px-2.5 py-1 text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-lg hover:bg-sky-100 transition"
                >
                  Resina Z350
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedItemsForProcedure({
                    'desc-1': 2, 'desc-4': 2, 'desc-8': 1, 'desc-9': 1, 'desc-10': 2, 'desc-11': 1, 'desc-12': 2, 'desc-21': 3, 'desc-22': 1
                  })}
                  className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 transition"
                >
                  Endodoncia Molar
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedItemsForProcedure({
                    'desc-1': 2, 'desc-4': 2, 'desc-10': 1, 'desc-11': 1, 'desc-12': 1, 'desc-13': 1, 'desc-14': 1
                  })}
                  className="px-2.5 py-1 text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 transition"
                >
                  Exodoncia Simple
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedItemsForProcedure({
                    'desc-10': 1, 'desc-11': 1, 'desc-12': 1, 'desc-17': 1, 'desc-18': 1, 'desc-15': 1
                  })}
                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition"
                >
                  Profilaxis Cavitron
                </button>
              </div>
            </div>

            {/* Cost Summary Box for Current Selected Procedure */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-sky-50/70 dark:bg-sky-950/30 rounded-xl border border-sky-100 dark:border-sky-900/40 text-xs">
              <div>
                <span className="text-[11px] text-sky-800 dark:text-sky-300 font-medium block">Insumos Utilizados en Acto Clínico:</span>
                <span className="text-lg font-black text-sky-950 dark:text-white">
                  {Object.values(selectedItemsForProcedure).reduce((a, b) => a + (b > 0 ? 1 : 0), 0)} productos ({Object.values(selectedItemsForProcedure).reduce((a, b) => a + b, 0)} unidades)
                </span>
              </div>

              <div>
                <span className="text-[11px] text-sky-800 dark:text-sky-300 font-medium block">Costo Directo Insumos ($):</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  ${Object.entries(selectedItemsForProcedure).reduce((sum, [id, qty]) => {
                    const it = descartablesList.find(d => d.id === id);
                    return sum + (it ? it.costPerUse * qty : 0);
                  }, 0).toFixed(2)} USD
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ≈ Bs. {(Object.entries(selectedItemsForProcedure).reduce((sum, [id, qty]) => {
                    const it = descartablesList.find(d => d.id === id);
                    return sum + (it ? it.costPerUse * qty : 0);
                  }, 0) * exchangeRate).toFixed(2)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-sky-800 dark:text-sky-300 font-medium block">Costo Sillón (45 min @ ${chairCostPerHour.toFixed(2)}/h):</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-200 font-mono">
                  ${(chairCostPerMinute * 45).toFixed(2)} USD
                </span>
              </div>

              <div className="bg-sky-600 text-white p-3 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-100 block">Precio Mínimo Sugerido:</span>
                  <span className="text-base font-black font-mono">
                    ${((Object.entries(selectedItemsForProcedure).reduce((sum, [id, qty]) => {
                      const it = descartablesList.find(d => d.id === id);
                      return sum + (it ? it.costPerUse * qty : 0);
                    }, 0) + (chairCostPerMinute * 45)) * 2.2).toFixed(2)} USD
                  </span>
                </div>
                <span className="text-[10px] text-sky-200 mt-0.5">Margen 55% + Retorno Inversión</span>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar insumo por nombre, marca (3M, Septodont, New Stetic...) o especificación..."
                  value={searchDescartable}
                  onChange={(e) => setSearchDescartable(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemsForProcedure({})}
                className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Limpiar Selección
              </button>
            </div>

            {/* Table of Descartables */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-3 w-12 text-center">Sel.</th>
                    <th className="p-3">Código</th>
                    <th className="p-3">Producto / Insumo</th>
                    <th className="p-3">Marca</th>
                    <th className="p-3">Especificación / Presentación</th>
                    <th className="p-3 text-right">Precio Empaque ($)</th>
                    <th className="p-3 text-center">Rendimiento / Usos</th>
                    <th className="p-3 text-right font-black text-sky-700 dark:text-sky-300">Costo Directo x Uso</th>
                    <th className="p-3 text-center">Cant. en Procedimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {descartablesList
                    .filter(d => 
                      !searchDescartable || 
                      d.name.toLowerCase().includes(searchDescartable.toLowerCase()) ||
                      d.brand.toLowerCase().includes(searchDescartable.toLowerCase()) ||
                      d.specification.toLowerCase().includes(searchDescartable.toLowerCase())
                    )
                    .map((item) => {
                      const qty = selectedItemsForProcedure[item.id] || 0;
                      const isSelected = qty > 0;
                      return (
                        <tr 
                          key={item.id} 
                          className={`transition ${isSelected ? 'bg-sky-50/50 dark:bg-sky-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}`}
                        >
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItemsForProcedure(prev => ({
                                  ...prev,
                                  [item.id]: isSelected ? 0 : 1
                                }));
                              }}
                              className="text-sky-600 hover:scale-110 transition"
                            >
                              {isSelected ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                            </button>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-500">#{item.code}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{item.name}</td>
                          <td className="p-3 font-semibold text-sky-700 dark:text-sky-300">{item.brand}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{item.specification}</td>
                          <td className="p-3 text-right font-mono">${item.price.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800">
                              {item.applications} {item.applications === 1 ? 'uso' : 'aplicaciones'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            ${item.costPerUse.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedItemsForProcedure(prev => ({
                                  ...prev,
                                  [item.id]: Math.max(0, (prev[item.id] || 0) - 1)
                                }))}
                                className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-mono font-bold">{qty}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedItemsForProcedure(prev => ({
                                  ...prev,
                                  [item.id]: (prev[item.id] || 0) + 1
                                }))}
                                className="w-6 h-6 rounded bg-sky-600 text-white flex items-center justify-center font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR EQUIPO NUEVO */}
      {showAddEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 bg-sky-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Nuevo Equipo Odontológico</h3>
              <button type="button" onClick={() => setShowAddEquipment(false)}>✕</button>
            </div>
            <form onSubmit={handleAddEquipmentSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nombre del Equipo:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sillón Dental Gnatus G3"
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Precio Compra ($ USD):</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={eqPrice}
                    onChange={(e) => setEqPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Vida Útil (Años):</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={eqYears}
                    onChange={(e) => setEqYears(parseInt(e.target.value) || 5)}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEquipment(false)}
                  className="px-3 py-1.5 border rounded-lg text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 text-white font-bold rounded-lg"
                >
                  Guardar Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

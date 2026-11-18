import React, { useState } from 'react';
import { useDental } from '../context/DentalContext';
import { X, UserPlus, Heart, AlertTriangle } from 'lucide-react';

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewPatientModal: React.FC<NewPatientModalProps> = ({ isOpen, onClose }) => {
  const { addPatient } = useDental();

  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('+58 ');
  const [email, setEmail] = useState('');
  const [profession, setProfession] = useState('');
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState<'M' | 'F' | 'Otro'>('M');
  const [bloodType, setBloodType] = useState('O+');
  const [allergiesText, setAllergiesText] = useState('NO APLICA');
  const [conditionsText, setConditionsText] = useState('N/A');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('+58 ');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Familiar directo');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cedula) return;

    const allergies = allergiesText && allergiesText.toUpperCase() !== 'NO APLICA'
      ? allergiesText.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const systemicConditions = conditionsText && conditionsText.toUpperCase() !== 'N/A'
      ? conditionsText.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    addPatient({
      name,
      cedula,
      phone,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      profession: profession || 'Particular',
      nationality: 'V - VENEZUELA',
      age: Number(age),
      gender,
      bloodType,
      allergies,
      systemicConditions,
      regularMedications: [],
      emergencyContact: {
        name: emergencyName || 'Contacto de Emergencia',
        phone: emergencyPhone || phone,
        relationship: emergencyRelationship || 'Familiar'
      }
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Registrar Nuevo Paciente
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Nombre y Apellidos Completos:
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Sofía Castillo Morales"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Cédula / Documento Identidad:
              </label>
              <input
                type="text"
                required
                placeholder="Ej. 20.450.123"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Teléfono / WhatsApp:
              </label>
              <input
                type="text"
                required
                placeholder="+58 414 0000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Edad:
              </label>
              <input
                type="number"
                min="1"
                max="110"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Género:
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-2.5 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
              >
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Grupo Sanguíneo:
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
              >
                <option value="O+">O+</option>
                <option value="A+">A+</option>
                <option value="B+">B+</option>
                <option value="AB+">AB+</option>
                <option value="O-">O-</option>
                <option value="A-">A-</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Correo Electrónico:
              </label>
              <input
                type="email"
                placeholder="paciente@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Ocupación / Profesión:
              </label>
              <input
                type="text"
                placeholder="Ej. Funcionario Público, Comerciante"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
              Datos de Contacto de Emergencia:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Nombre Familiar:</label>
                <input
                  type="text"
                  placeholder="Ej. Gabriel (Hijo)"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Teléfono Emergencia:</label>
                <input
                  type="text"
                  placeholder="+58 414 0000000"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Parentesco:</label>
                <input
                  type="text"
                  placeholder="Hijo / Cónyuge"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none text-xs"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Alergias (separar por comas si tiene):
            </label>
            <input
              type="text"
              placeholder="Ej. Penicilina, AINEs, Látex"
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Condiciones Médicas / Sistémicas:
            </label>
            <input
              type="text"
              placeholder="Ej. Hipertensión, Diabetes, Asma"
              value={conditionsText}
              onChange={(e) => setConditionsText(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition shadow-xs"
            >
              Crear Ficha y Abrir Historia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

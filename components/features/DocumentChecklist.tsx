
import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, AlertCircle, Upload, FileText, ChevronRight } from 'lucide-react';
import { PRODUCT_CONFIGS, TypeDocument, EtapeProcessus } from '../../documentRequirements';

interface DocumentChecklistProps {
  codeProduit: string;
  documentsRecus: Array<{
    type: TypeDocument;
    url?: string;
    date_upload?: string;
    valide: boolean;
  }>;
  onUpload: (type: TypeDocument) => void;
}

const DocumentChecklist: React.FC<DocumentChecklistProps> = ({ codeProduit, documentsRecus, onUpload }) => {
  const config = PRODUCT_CONFIGS[codeProduit.toLowerCase()] || PRODUCT_CONFIGS["auto"];
  const etapes: { id: EtapeProcessus; label: string }[] = [
    { id: 'sollicitation', label: '1. Sollicitation' },
    { id: 'analyse', label: '2. Analyse Risques' },
    { id: 'devis', label: '3. Établissement Devis' },
    { id: 'signature', label: '4. Signature' },
    { id: 'activation', label: '5. Activation' },
  ];

  return (
    <div className="space-y-8">
      {etapes.map((etape) => {
        const etapeDocs = config.documents.filter(d => d.etape === etape.id);
        if (etapeDocs.length === 0) return null;

        const etapeScoreMax = etapeDocs.reduce((acc, d) => acc + d.ges_poids, 0);
        const etapeScore = etapeDocs.reduce((acc, d) => {
          const doc = documentsRecus.find(dr => dr.type === d.type && dr.valide);
          return acc + (doc ? d.ges_poids : 0);
        }, 0);
        const etapePercent = (etapeScore / etapeScoreMax) * 100;

        return (
          <div key={etape.id} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 bg-slate-50/50 flex justify-between items-center border-b border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{etape.label}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Poids GES : {etapeScoreMax} pts</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${etapePercent}%` }}
                    className="h-full bg-[#4F7CFF]"
                  />
                </div>
                <span className="text-xs font-black text-slate-900">{Math.round(etapePercent)}%</span>
              </div>
            </div>
            
            <div className="divide-y divide-slate-50">
              {etapeDocs.map((doc) => {
                const recu = documentsRecus.find(dr => dr.type === doc.type);
                const status = recu ? (recu.valide ? 'valide' : 'attente') : 'manquant';

                return (
                  <div key={doc.type} className="p-5 flex items-center justify-between group hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                        status === 'valide' ? 'bg-green-50 border-green-200 text-green-500 shadow-sm shadow-green-100' :
                        status === 'attente' ? 'bg-orange-50 border-orange-200 text-orange-500 shadow-sm shadow-orange-100' :
                        'bg-white border-slate-100 text-slate-200'
                      }`}>
                        {status === 'valide' ? <Check size={20} /> : status === 'attente' ? <Clock size={20} /> : <FileText size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-sm text-slate-900">{doc.label}</p>
                          {doc.obligatoire && <span className="text-[8px] font-black bg-red-50 text-red-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">Requis</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{doc.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GES</p>
                        <p className="text-xs font-black text-[#4F7CFF]">+{doc.ges_poids} pts</p>
                      </div>
                      
                      {status === 'valide' ? (
                        <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest bg-green-50 px-3 py-1.5 rounded-xl border border-green-100 shadow-sm">
                          Conforme
                        </div>
                      ) : (
                        <button 
                          onClick={() => onUpload(doc.type)}
                          className="p-3 rounded-xl bg-slate-100 text-slate-400 hover:bg-[#4F7CFF] hover:text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all group-hover:scale-105"
                        >
                          <Upload size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentChecklist;

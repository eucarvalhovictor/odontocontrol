import { Search } from 'lucide-react';

// Barra de pesquisa: peça única — só ícone + campo, sem botões internos.
export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="search grow">
      <span className="search-icon"><Search size={16} /></span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

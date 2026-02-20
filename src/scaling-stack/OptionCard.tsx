interface OptionCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

const OptionCard = ({ label, selected, onClick }: OptionCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`ss-option-card w-full text-left${selected ? " selected" : ""}`}
  >
    <span className="text-[15px] font-medium text-[hsl(var(--ss-card-fg))] leading-snug">
      {label}
    </span>
    <div className="ss-option-radio ml-3">
      <div className="ss-option-radio-dot" />
    </div>
  </button>
);

export default OptionCard;

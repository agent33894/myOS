import { useState } from 'react';
import { Input, type InputProps } from '../../ui';

const parse = (text: string): number | undefined => {
  const value = Number(text);
  return text.trim() === '' || Number.isNaN(value) ? undefined : value;
};

interface NumberInputProps extends Omit<InputProps, 'value' | 'onChange' | 'defaultValue'> {
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
}

/** A number field that keeps in-progress text like "1." or "-" while reporting parsed values. */
export function NumberInput({ value, onValueChange, ...props }: NumberInputProps) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  if (parse(text) !== value) setText(value === undefined ? '' : String(value));
  return (
    <Input
      inputMode="decimal"
      {...props}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onValueChange(parse(event.target.value));
      }}
    />
  );
}

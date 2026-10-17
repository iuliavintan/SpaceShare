import { objectInput, textInput } from '../../shared/validation.js';

export function categoryInput(value: unknown) {
  return textInput(objectInput(value, ['name']).name, 'Categorie', 80);
}

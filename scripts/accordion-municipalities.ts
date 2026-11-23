export const accordionMunicipalities={
 baztan:{url:'https://www.baztan.eus/enplegu-publikoa/',name:'Ayuntamiento de Baztan',location:'Baztan'},
 estella:{url:'https://www.estella-lizarra.com/actualidad/empleo-publico/',name:'Ayuntamiento de Estella-Lizarra',location:'Estella-Lizarra'},
} as const;
export type AccordionMunicipality=keyof typeof accordionMunicipalities;

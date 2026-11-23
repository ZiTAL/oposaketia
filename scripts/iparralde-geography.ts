import municipalities from '../docs/inventory/municipalities.json';
import {normalize} from '../src/lib/catalogue';
import {type Province,iparraldeProvinces} from '../src/lib/geography';

const words=(value:string)=>normalize(value).replace(/[^a-z0-9]+/g,' ').trim();
const communes=municipalities.filter(item=>item.territory==='País Vasco francés');

export function iparraldeProvince(town:string):Province|null{
  const commune=communes.find(item=>words(item.name)===words(town));
  return commune&&iparraldeProvinces.some(province=>province===commune.province)?commune.province as Province:null;
}

export function iparraldeWorkplaceTown(workplace:string):string|null{
  const address=words(workplace).replace(/\s+france$/,'').replace(/\s+cedex(?:\s+\d+)?$/,'');
  const matches=communes.filter(item=>{
    const town=words(item.name);
    return address===town||new RegExp(`\\b64\\d{3} ${town}$`).test(address);
  });
  return matches.length===1?matches[0].name:null;
}

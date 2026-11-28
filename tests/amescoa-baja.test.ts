import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAmescoaLinks} from '../scripts/scrapers/amescoa-baja';

const listing=(notice:string,bases:string)=>`<a href="${notice}">Bandos 14 Octubre 2026 Convocatoria prueba selectiva contratación. Peón de la construcción</a><a href="${bases}">Bandos 14 Octubre 2026 Condicionado prueba selectiva y modelo de instancia</a>`;
const notice='/documents/715_Bando.pdf',bases='/documents/714_Condicionado.pdf';

test('Améscoa Baja binds the dated municipal notice to its own bases',()=>{
  assert.deepEqual(parseAmescoaLinks(listing(notice,bases)),{
    notice:'https://amescoabaja.org/documents/715_Bando.pdf',
    bases:'https://amescoabaja.org/documents/714_Condicionado.pdf'
  });
  assert.throws(()=>parseAmescoaLinks(listing('https://other.example/documents/715_Bando.pdf',bases)));
  assert.throws(()=>parseAmescoaLinks(listing(notice,'/documents/714_Condicionado.html')));
  assert.throws(()=>parseAmescoaLinks(listing(notice,bases).replace('14 Octubre 2026','13 Octubre 2026')));
});

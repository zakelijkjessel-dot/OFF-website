# 3D-modellen

Plaats hier het auto-model voor de hero:

```
models/car.glb
```

De hero (`js/hero-car.js`) laadt dit bestand met `GLTFLoader` en verdeelt
~40.000 punten over het oppervlak met `MeshSurfaceSampler`. Het pad staat in
`js/hero-car.js` als `MODEL_URL = 'models/car.glb'` — pas dat aan als je het
model ergens anders neerzet.

**Ontbreekt het bestand?** Dan toont de hero automatisch een nette fallback:
een eenvoudige auto opgebouwd uit basisvormen, óók als gloeiende puntenwolk.

Tips voor het model:
- Formaat: `.glb` (glTF binary). Draco-compressie wordt ondersteund.
- Houd het aantal meshes redelijk; alle meshes worden naar verhouding van hun
  oppervlak gesampled.
- Een schone, gesloten auto-mesh geeft het mooiste resultaat.

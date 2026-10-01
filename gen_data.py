"""Molecule / protein reference data for promo.html  ->  data.js"""
import json
import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, QED, rdDepictor, Crippen, rdMolDescriptors

MOLS = {
    'caffeine': 'Cn1cnc2c1c(=O)n(C)c(=O)n2C',
    'aspirin': 'CC(=O)Oc1ccccc1C(=O)O',
    'ibuprofen': 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
    'paracetamol': 'CC(=O)Nc1ccc(O)cc1',
    'phenol': 'Oc1ccccc1',
    'cresol': 'Cc1ccc(O)cc1',
    'methacetin': 'CC(=O)Nc1ccc(OC)cc1',
    'phenacetin': 'CC(=O)Nc1ccc(OCC)cc1',
    'melatonin': 'CC(=O)NCCc1c[nH]c2ccc(OC)cc12',
    'imatinib': 'Cc1ccc(NC(=O)c2ccc(CN3CCN(C)CC3)cc2)cc1Nc1nccc(-c2cccnc2)n1',
    'celecoxib': 'Cc1ccc(-c2cc(C(F)(F)F)nn2-c2ccc(S(N)(=O)=O)cc2)cc1',
    'osimertinib': 'COc1cc(N(C)CCN(C)C)c(NC(=O)C=C)cc1Nc1nccc(-c2cn(C)c3ccccc23)n1',
}


def mol_data(smi, seed=7):
    m = Chem.MolFromSmiles(smi)
    rdDepictor.Compute2DCoords(m)
    c2 = m.GetConformer().GetPositions()[:, :2]
    c2 = c2 - c2.mean(0)
    mh = Chem.AddHs(m)
    AllChem.EmbedMolecule(mh, randomSeed=seed)
    AllChem.MMFFOptimizeMolecule(mh)
    c3 = mh.GetConformer().GetPositions()[:m.GetNumAtoms()]
    c3 = c3 - c3.mean(0)
    bonds = [[b.GetBeginAtomIdx(), b.GetEndAtomIdx(), 1.5 if b.GetIsAromatic() else b.GetBondTypeAsDouble()] for b in m.GetBonds()]
    return dict(smi=smi, atoms=[a.GetSymbol() for a in m.GetAtoms()], bonds=bonds,
                p2=np.round(c2, 3).tolist(), p3=np.round(c3, 3).tolist(),
                props=dict(mw=round(Descriptors.MolWt(m), 1), logp=round(Crippen.MolLogP(m), 2), qed=round(QED.qed(m), 2),
                           tpsa=round(rdMolDescriptors.CalcTPSA(m), 1), hbd=rdMolDescriptors.CalcNumHBD(m),
                           hba=rdMolDescriptors.CalcNumHBA(m)))


out = {'mols': {k: mol_data(v) for k, v in MOLS.items()}}
# ubiquitin CA trace + secondary structure (from HELIX/SHEET records)
ca, seq, ss = [], '', {}
three = dict(ALA='A', ARG='R', ASN='N', ASP='D', CYS='C', GLN='Q', GLU='E', GLY='G', HIS='H', ILE='I', LEU='L', LYS='K',
             MET='M', PHE='F', PRO='P', SER='S', THR='T', TRP='W', TYR='Y', VAL='V')
for line in open('1UBQ.pdb'):
    if line.startswith('HELIX'):
        for r in range(int(line[21:25]), int(line[33:37]) + 1):
            ss[r] = 'H'
    if line.startswith('SHEET'):
        for r in range(int(line[22:26]), int(line[33:37]) + 1):
            ss[r] = 'E'
    if line.startswith('ATOM') and line[12:16].strip() == 'CA':
        ca.append([float(line[30:38]), float(line[38:46]), float(line[46:54])])
        seq += three[line[17:20]]
ca = np.array(ca)
ca -= ca.mean(0)
out['ubq'] = dict(ca=np.round(ca, 2).tolist(), seq=seq, ss=''.join(ss.get(i + 1, 'C') for i in range(len(seq))))
open('data.js', 'w').write('window.DATA = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print({k: (len(v['atoms']), v['props']) for k, v in out['mols'].items()}, len(seq), out['ubq']['ss'])

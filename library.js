// Liikekirjasto. Muoto: [nimi, lihasryhmä, hakusanat (vaihtoehtoiset nimet ja englanninkieliset nimet)]
// Ohjelmarunkojen liikkeiden nimien pitää täsmätä tämän listan nimiin, jotta historia pysyy yhtenäisenä.
const LIBRARY = [
  // Rinta
  ['Penkkipunnerrus', 'Rinta', 'bench press barbell tanko'],
  ['Penkkipunnerrus käsipainoilla', 'Rinta', 'dumbbell bench press'],
  ['Vinopenkkipunnerrus tangolla', 'Rinta', 'incline bench press vinopenkki'],
  ['Vinopenkki käsipainoilla', 'Rinta', 'incline dumbbell press vinopenkkipunnerrus'],
  ['Alavinopenkki', 'Rinta', 'decline bench press'],
  ['Rintaprässi', 'Rinta', 'chest press machine laite'],
  ['Rintarist käsipainoilla', 'Rinta', 'dumbbell fly rintaristi'],
  ['Rintarist taljalla', 'Rinta', 'cable fly crossover ristiveto'],
  ['Rintarist laitteessa', 'Rinta', 'pec deck butterfly'],
  ['Dipit', 'Rinta', 'dips dippi pystypunnerrus tangoissa'],
  ['Punnerrus', 'Rinta', 'push up push-up vatsallaan'],
  // Selkä
  ['Leuanveto', 'Selkä', 'pull up pull-up chin up chin-up leuka'],
  ['Avustettu leuanveto', 'Selkä', 'assisted pull up laite'],
  ['Ylätalja', 'Selkä', 'lat pulldown alaveto'],
  ['Kapea ylätalja', 'Selkä', 'close grip pulldown vedin'],
  ['Alatalja soutu', 'Selkä', 'seated cable row soutu taljalla istuen'],
  ['Kulmasoutu', 'Selkä', 'barbell row bent over row tankosoutu'],
  ['Käsipainosoutu', 'Selkä', 'one arm dumbbell row yhden käden soutu'],
  ['Rintatuettu soutu', 'Selkä', 'chest supported row'],
  ['T-tankosoutu', 'Selkä', 't bar row'],
  ['Soutulaite', 'Selkä', 'machine row'],
  ['Suorakätinen ylätalja', 'Selkä', 'straight arm pulldown pullover taljalla'],
  ['Selänojennus', 'Selkä', 'back extension hyperextension selkäpenkki'],
  ['Hartioidenkohautus', 'Selkä', 'shrug kohautus ylälihas'],
  // Olkapäät
  ['Pystypunnerrus', 'Olkapäät', 'overhead press military press ohp olkapunnerrus'],
  ['Pystypunnerrus käsipainoilla', 'Olkapäät', 'dumbbell shoulder press'],
  ['Olkapääprässi', 'Olkapäät', 'shoulder press machine laite'],
  ['Arnold-punnerrus', 'Olkapäät', 'arnold press'],
  ['Sivunostot', 'Olkapäät', 'lateral raise sivunosto'],
  ['Sivunosto taljalla', 'Olkapäät', 'cable lateral raise'],
  ['Etunostot', 'Olkapäät', 'front raise etunosto'],
  ['Takaolkapää', 'Olkapäät', 'rear delt fly reverse fly takaolkapäänosto'],
  ['Face pull', 'Olkapäät', 'facepull takaolka taljalla'],
  ['Pystysoutu', 'Olkapäät', 'upright row'],
  // Hauis
  ['Hauiskääntö', 'Hauis', 'biceps curl käsipainoilla'],
  ['Hauiskääntö tangolla', 'Hauis', 'barbell curl ez tanko'],
  ['Vasarakääntö', 'Hauis', 'hammer curl'],
  ['Saarnaajapenkki', 'Hauis', 'preacher curl'],
  ['Hauiskääntö taljalla', 'Hauis', 'cable curl'],
  ['Vinopenkkihauiskääntö', 'Hauis', 'incline curl'],
  // Ojentajat
  ['Ojentajat taljalla', 'Ojentajat', 'triceps pushdown pushdown ojentajapunnerrus'],
  ['Ranskalainen punnerrus', 'Ojentajat', 'skull crusher french press otsapunnerrus'],
  ['Ojentajat pään yli', 'Ojentajat', 'overhead triceps extension ojennus'],
  ['Penkkipunnerrus ahdas ote', 'Ojentajat', 'close grip bench press'],
  ['Taka-ojennus', 'Ojentajat', 'kickback triceps kickback'],
  // Etureidet
  ['Takakyykky', 'Etureidet', 'back squat kyykky squat'],
  ['Etukyykky', 'Etureidet', 'front squat'],
  ['Jalkaprässi', 'Etureidet', 'leg press prässi'],
  ['Jalan ojennus', 'Etureidet', 'leg extension jalkaojennus reisiojennus'],
  ['Bulgarialainen askelkyykky', 'Etureidet', 'bulgarian split squat'],
  ['Askelkyykky', 'Etureidet', 'lunge walking lunge astumiskyykky'],
  ['Hack-kyykky', 'Etureidet', 'hack squat'],
  ['Goblet-kyykky', 'Etureidet', 'goblet squat kahvakuula'],
  ['Askelnousu', 'Etureidet', 'step up step-up'],
  ['Smith-kyykky', 'Etureidet', 'smith squat'],
  // Takareidet
  ['Maastaveto', 'Takareidet', 'deadlift'],
  ['Romanian maastaveto', 'Takareidet', 'rdl romanian deadlift suorin jaloin'],
  ['Suorin jaloin maastaveto', 'Takareidet', 'stiff leg deadlift'],
  ['Sumo-maastaveto', 'Takareidet', 'sumo deadlift'],
  ['Jalkakoukistus istuen', 'Takareidet', 'seated leg curl koukistus'],
  ['Jalkakoukistus makuulla', 'Takareidet', 'lying leg curl koukistus'],
  ['Hyvää huomenta', 'Takareidet', 'good morning'],
  ['Pohjoismainen jalkakoukistus', 'Takareidet', 'nordic curl'],
  // Pakarat
  ['Lonkannosto', 'Pakarat', 'hip thrust'],
  ['Pakarasilta', 'Pakarat', 'glute bridge'],
  ['Pakarapotku taljalla', 'Pakarat', 'cable kickback glute kickback'],
  ['Lonkan loitonnus laitteessa', 'Pakarat', 'hip abduction loitonnus'],
  // Pohkeet
  ['Pohjenousu seisten', 'Pohkeet', 'standing calf raise pohje'],
  ['Pohjenousu istuen', 'Pohkeet', 'seated calf raise pohje'],
  ['Pohjenousu jalkaprässissä', 'Pohkeet', 'leg press calf raise pohje'],
  // Vatsa
  ['Vatsarutistus taljalla', 'Vatsa', 'cable crunch'],
  ['Vatsarutistus', 'Vatsa', 'crunch vatsa'],
  ['Jalannosto riippuen', 'Vatsa', 'hanging leg raise'],
  ['Lankku', 'Vatsa', 'plank'],
  ['Vatsarulla', 'Vatsa', 'ab wheel rollout'],
  ['Venäläinen kierto', 'Vatsa', 'russian twist']
];

// ---------- Liikeohjeet (ExRx.net) ----------
// Suorat linkit ExRx:n liikesivuihin. Osoitteet on poimittu ExRx:n omasta liikelistasta (exrx.net/Lists/Directory)
// ja jokainen sivu on tarkistettu toimivaksi. Liikkeet, joille ei ole ilmaista omaa sivua (esim. sumo-maastaveto),
// ohjataan lihasryhmän liikelistalle.
const EXRX_BASE = 'https://exrx.net/WeightExercises/';
const EXRX_PAGES = {
 "Penkkipunnerrus": "PectoralSternal/BBBenchPress",
 "Penkkipunnerrus käsipainoilla": "PectoralSternal/DBBenchPress",
 "Vinopenkkipunnerrus tangolla": "PectoralClavicular/BBInclineBenchPress",
 "Vinopenkki käsipainoilla": "PectoralClavicular/DBInclineBenchPress",
 "Alavinopenkki": "PectoralSternal/BBDeclineBenchPress",
 "Rintaprässi": "PectoralSternal/LVChestPress",
 "Rintarist käsipainoilla": "PectoralSternal/DBFly",
 "Rintarist taljalla": "PectoralSternal/CBStandingFly",
 "Rintarist laitteessa": "PectoralSternal/LVPecDeckFly",
 "Dipit": "PectoralSternal/BWChestDip",
 "Punnerrus": "PectoralSternal/BWPushup",
 "Leuanveto": "LatissimusDorsi/BWPullup",
 "Avustettu leuanveto": "LatissimusDorsi/ASPullupBand",
 "Ylätalja": "LatissimusDorsi/CBFrontPulldown",
 "Kapea ylätalja": "LatissimusDorsi/CBCloseGripPulldown",
 "Alatalja soutu": "BackGeneral/CBSeatedRow",
 "Kulmasoutu": "BackGeneral/BBBentOverRow",
 "Käsipainosoutu": "BackGeneral/DBBentOverRow",
 "Rintatuettu soutu": "BackGeneral/DBLyingRow",
 "T-tankosoutu": "BackGeneral/LVTBarRow",
 "Soutulaite": "BackGeneral/LVSeatedRow",
 "Suorakätinen ylätalja": "LatissimusDorsi/CBBentoverPullover",
 "Selänojennus": "ErectorSpinae/BW45HyperextensionArmsCrossed",
 "Hartioidenkohautus": "TrapeziusUpper/DBShrug",
 "Pystypunnerrus": "DeltoidAnterior/BBMilitaryPress",
 "Pystypunnerrus käsipainoilla": "DeltoidAnterior/DBShoulderPress",
 "Olkapääprässi": "DeltoidAnterior/LVShoulderPress",
 "Arnold-punnerrus": "DeltoidAnterior/DBArnoldPress",
 "Sivunostot": "DeltoidLateral/DBLateralRaise",
 "Sivunosto taljalla": "DeltoidLateral/CBLateralRaise",
 "Etunostot": "DeltoidAnterior/DBFrontRaise",
 "Takaolkapää": "DeltoidPosterior/DBRearLateralRaise",
 "Face pull": "DeltoidPosterior/CBStandingRearDeltRowRope",
 "Pystysoutu": "DeltoidLateral/BBUprightRow",
 "Hauiskääntö": "Biceps/DBCurl",
 "Hauiskääntö tangolla": "Biceps/BBCurl",
 "Vasarakääntö": "Brachioradialis/DBHammerCurl",
 "Saarnaajapenkki": "Brachialis/BBPreacherCurl",
 "Hauiskääntö taljalla": "Biceps/CBCurl",
 "Vinopenkkihauiskääntö": "Biceps/DBInclineCurl",
 "Ojentajat taljalla": "Triceps/CBPushdown",
 "Ranskalainen punnerrus": "Triceps/BBLyingTriExt",
 "Ojentajat pään yli": "Triceps/DBTriExt",
 "Penkkipunnerrus ahdas ote": "Triceps/BBCloseGripBenchPress",
 "Taka-ojennus": "Triceps/DBKickback",
 "Takakyykky": "Quadriceps/BBSquat",
 "Etukyykky": "Quadriceps/BBFrontSquat",
 "Jalkaprässi": "Quadriceps/SL45LegPress",
 "Jalan ojennus": "Quadriceps/LVLegExtension",
 "Bulgarialainen askelkyykky": "Quadriceps/BWSingleLegSplitSquat",
 "Askelkyykky": "Quadriceps/DBLunge",
 "Hack-kyykky": "Quadriceps/SLHackSquat",
 "Goblet-kyykky": "Quadriceps/DBSquat",
 "Askelnousu": "Quadriceps/DBStepUp",
 "Smith-kyykky": "Quadriceps/SMSquat",
 "Maastaveto": "ErectorSpinae/BBDeadlift",
 "Romanian maastaveto": "OlympicLifts/RomanianDeadlift",
 "Suorin jaloin maastaveto": "ErectorSpinae/BBStiffLegDeadlift",
 "Jalkakoukistus istuen": "Hamstrings/LVSeatedLegCurl",
 "Jalkakoukistus makuulla": "Hamstrings/LVLyingLegCurl",
 "Hyvää huomenta": "Hamstrings/BBGoodMorning",
 "Pohjoismainen jalkakoukistus": "Hamstrings/ASHamstringRaiseSelf",
 "Lonkannosto": "GluteusMaximus/BBHipThrust",
 "Pakarasilta": "GluteusMaximus/STHipBridge",
 "Pakarapotku taljalla": "GluteusMaximus/CBGluteKickback",
 "Lonkan loitonnus laitteessa": "HipAbductor/LVSeatedHipAbduction",
 "Pohjenousu seisten": "Gastrocnemius/LVStandingCalfRaise",
 "Pohjenousu istuen": "Soleus/LVSeatedCalfRaise",
 "Pohjenousu jalkaprässissä": "Gastrocnemius/SL45CalfPress",
 "Vatsarutistus taljalla": "RectusAbdominis/CBKneelingCrunch",
 "Vatsarutistus": "RectusAbdominis/BWCrunch",
 "Jalannosto riippuen": "HipFlexors/BWHangingLegRaise",
 "Lankku": "RectusAbdominis/BWFrontPlank"
};

// Lihasryhmän liikelista ExRx:ssä varalinkiksi
const EXRX_LISTS = {
  'Rinta': 'ChestWt', 'Selkä': 'BackWt', 'Olkapäät': 'ShouldWt', 'Hauis': 'ArmWt#Biceps', 'Ojentajat': 'ArmWt#Triceps',
  'Etureidet': 'ThighWt#Quadriceps', 'Takareidet': 'ThighWt#Hamstrings', 'Pakarat': 'HipsWt#Gluteus',
  'Pohkeet': 'CalfWt', 'Vatsa': 'WaistWt'
};

// Palauttaa { url, direct } tai null. direct = suora liikesivu, muuten lihasryhmän lista.
function exrxLink(name, muscle) {
  if (EXRX_PAGES[name]) return { url: EXRX_BASE + EXRX_PAGES[name], direct: true };
  if (EXRX_LISTS[muscle]) return { url: 'https://exrx.net/Lists/ExList/' + EXRX_LISTS[muscle], direct: false };
  return null;
}

// ---------- Toissijaiset lihasryhmät ----------
// Liikkeen toissijaiset lihasryhmät. Tilastoissa jokainen työsarja lasketaan toissijaisille 0,5 sarjana.
// Luettelo kattaa vain ne lihasryhmät, joita sovellus seuraa (rinta, selkä, olkapäät, hauis, ojentajat,
// etu- ja takareidet, pakarat, pohkeet, vatsa). Liikkeet, joilla ei ole listassa mainintaa, ovat käytännössä eristäviä.
const SECONDARY = {
  // Rinta
  'Penkkipunnerrus': ['Olkapäät', 'Ojentajat'],
  'Penkkipunnerrus käsipainoilla': ['Olkapäät', 'Ojentajat'],
  'Vinopenkkipunnerrus tangolla': ['Olkapäät', 'Ojentajat'],
  'Vinopenkki käsipainoilla': ['Olkapäät', 'Ojentajat'],
  'Alavinopenkki': ['Ojentajat', 'Olkapäät'],
  'Rintaprässi': ['Olkapäät', 'Ojentajat'],
  'Rintarist käsipainoilla': ['Olkapäät'],
  'Rintarist taljalla': ['Olkapäät'],
  'Rintarist laitteessa': ['Olkapäät'],
  'Dipit': ['Ojentajat', 'Olkapäät'],
  'Punnerrus': ['Olkapäät', 'Ojentajat'],
  // Selkä
  'Leuanveto': ['Hauis'],
  'Avustettu leuanveto': ['Hauis'],
  'Ylätalja': ['Hauis'],
  'Kapea ylätalja': ['Hauis'],
  'Alatalja soutu': ['Hauis', 'Olkapäät'],
  'Kulmasoutu': ['Hauis', 'Olkapäät'],
  'Käsipainosoutu': ['Hauis', 'Olkapäät'],
  'Rintatuettu soutu': ['Hauis', 'Olkapäät'],
  'T-tankosoutu': ['Hauis', 'Olkapäät'],
  'Soutulaite': ['Hauis', 'Olkapäät'],
  'Selänojennus': ['Pakarat', 'Takareidet'],
  // Olkapäät
  'Pystypunnerrus': ['Ojentajat', 'Rinta'],
  'Pystypunnerrus käsipainoilla': ['Ojentajat', 'Rinta'],
  'Olkapääprässi': ['Ojentajat', 'Rinta'],
  'Arnold-punnerrus': ['Ojentajat'],
  'Etunostot': ['Rinta'],
  'Takaolkapää': ['Selkä'],
  'Face pull': ['Selkä'],
  'Pystysoutu': ['Selkä', 'Hauis'],
  // Ojentajat
  'Penkkipunnerrus ahdas ote': ['Rinta', 'Olkapäät'],
  // Etureidet
  'Takakyykky': ['Pakarat'],
  'Etukyykky': ['Pakarat'],
  'Jalkaprässi': ['Pakarat'],
  'Bulgarialainen askelkyykky': ['Pakarat'],
  'Askelkyykky': ['Pakarat'],
  'Hack-kyykky': ['Pakarat'],
  'Goblet-kyykky': ['Pakarat'],
  'Askelnousu': ['Pakarat'],
  'Smith-kyykky': ['Pakarat'],
  // Takareidet
  'Maastaveto': ['Pakarat', 'Selkä'],
  'Romanian maastaveto': ['Pakarat', 'Selkä'],
  'Suorin jaloin maastaveto': ['Pakarat', 'Selkä'],
  'Sumo-maastaveto': ['Pakarat', 'Etureidet', 'Selkä'],
  'Hyvää huomenta': ['Pakarat', 'Selkä'],
  // Pakarat
  'Lonkannosto': ['Takareidet'],
  'Pakarasilta': ['Takareidet']
};

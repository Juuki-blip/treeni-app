// Valmiit ohjelmarungot. Muoto: [liike, sarjojen määrä, toistoalue min, toistoalue max]
//
// Periaatteet (nykyinen tutkimusnäyttö lihaskasvusta ja voimasta):
// - Noin 10-20 kovaa sarjaa lihasryhmää kohden viikossa riittää useimmille lihaskasvuun.
// - Jokainen lihasryhmä kannattaa treenata vähintään kaksi kertaa viikossa.
// - Sarjat lähelle uupumusta: yleensä 1-3 toistoa varaan (RPE 7-9). Eristävissä liikkeissä voi mennä lähemmäs (RPE 9-10).
// - Perusliikkeet matalammilla toistoilla (5-10), eristävät liikkeet korkeammilla (10-20).
// - Eteneminen: kun kaikki sarjat yltävät toistoalueen ylärajaan, nosta painoa (kaksoisprogressio).
// - Palautuminen: lepo 2-3 min perusliikkeissä, 1-2 min eristävissä.
// Nämä ovat yleisiä lähtökohtia terveelle aikuiselle, eivät yksilöllistä valmennusta.

const PROGRAM_NOTES = 'Lepo: 2–3 min perusliikkeissä, 1–2 min eristävissä. Tee työsarjat 1–3 toistoa ennen uupumusta (RPE 7–9). ' +
  'Kun kaikki sarjat yltävät toistoalueen ylärajaan, nosta painoa. Liikkeet voi vaihtaa vastaaviin, jos jokin ei sovi tai laite puuttuu. ' +
  'Kipu ei kuulu treeniin: jos jokin liike tuntuu pahalta, jätä se pois ja ota tarvittaessa yhteys ammattilaiseen.';

const PROGRAMS = [
  {
    id: 'ylaala',
    name: 'Ylä-ala jako (4 pv/vko)',
    info: 'Neljä treeniä viikossa: ylävartalo, alavartalo, ylävartalo, alavartalo (esim. ma, ti, to, pe). Jokainen lihasryhmä tulee kahdesti viikossa, ja sarjamäärä on keskitasoa (noin 9–15 sarjaa isoa lihasryhmää kohden viikossa). Lisää sarjoja vasta, kun edistyminen hidastuu.',
    days: [
      { name: 'Ylävartalo A', exercises: [
        ['Penkkipunnerrus', 3, 6, 10], ['Kulmasoutu', 3, 6, 10], ['Vinopenkki käsipainoilla', 3, 8, 12],
        ['Ylätalja', 3, 8, 12], ['Sivunostot', 3, 12, 20], ['Ojentajat taljalla', 3, 10, 15], ['Hauiskääntö', 3, 10, 15]] },
      { name: 'Alavartalo A', exercises: [
        ['Takakyykky', 3, 5, 8], ['Romanian maastaveto', 3, 8, 12], ['Jalkaprässi', 3, 10, 15],
        ['Jalkakoukistus istuen', 3, 10, 15], ['Pohjenousu seisten', 4, 10, 15], ['Vatsarutistus taljalla', 3, 10, 15]] },
      { name: 'Ylävartalo B', exercises: [
        ['Pystypunnerrus', 3, 6, 10], ['Leuanveto', 3, 6, 10], ['Rintaprässi', 3, 10, 15],
        ['Alatalja soutu', 3, 8, 12], ['Takaolkapää', 3, 12, 20], ['Ranskalainen punnerrus', 3, 8, 12], ['Vasarakääntö', 3, 10, 15]] },
      { name: 'Alavartalo B', exercises: [
        ['Maastaveto', 3, 5, 8], ['Bulgarialainen askelkyykky', 3, 8, 12], ['Lonkannosto', 3, 8, 12],
        ['Jalan ojennus', 3, 10, 15], ['Jalkakoukistus makuulla', 3, 10, 15], ['Pohjenousu istuen', 3, 12, 20]] }
    ]
  },
  {
    id: 'sekatreeni',
    name: 'Sekatreeni / koko keho (3 pv/vko)',
    info: 'Kolme koko kehon treeniä viikossa (esim. ma, ke, pe). Jokainen lihasryhmä tulee 2–3 kertaa viikossa pienemmällä sarjamäärällä per treeni. Sopii hyvin aloittelijalle ja kiireiselle, ja treenit ovat lyhyitä (noin 45–60 min).',
    days: [
      { name: 'Koko keho A', exercises: [
        ['Takakyykky', 3, 5, 8], ['Penkkipunnerrus', 3, 6, 10], ['Alatalja soutu', 3, 8, 12],
        ['Romanian maastaveto', 2, 8, 12], ['Sivunostot', 2, 12, 20], ['Vatsarutistus taljalla', 2, 10, 15]] },
      { name: 'Koko keho B', exercises: [
        ['Jalkaprässi', 3, 8, 12], ['Pystypunnerrus', 3, 6, 10], ['Ylätalja', 3, 8, 12],
        ['Jalkakoukistus istuen', 2, 10, 15], ['Hauiskääntö', 2, 10, 15], ['Ojentajat taljalla', 2, 10, 15]] },
      { name: 'Koko keho C', exercises: [
        ['Maastaveto', 3, 5, 8], ['Vinopenkki käsipainoilla', 3, 8, 12], ['Leuanveto', 3, 6, 10],
        ['Bulgarialainen askelkyykky', 2, 8, 12], ['Takaolkapää', 2, 12, 20], ['Pohjenousu seisten', 3, 10, 15]] }
    ]
  },
  {
    id: 'ppl',
    name: 'Työntö-veto-jalat (3 tai 6 pv/vko)',
    info: 'Kolme treeniä: työntö (rinta, olkapäät, ojentajat), veto (selkä, hauis) ja jalat. Kolmella päivällä viikossa jokainen lihasryhmä tulee kerran, kuudella päivällä (kierto kahdesti) kahdesti viikossa. Kuuden päivän versio vaatii hyvää palautumista, joten aloita kolmella.',
    days: [
      { name: 'Työntö', exercises: [
        ['Penkkipunnerrus', 3, 6, 10], ['Pystypunnerrus', 3, 8, 12], ['Vinopenkki käsipainoilla', 3, 8, 12],
        ['Sivunostot', 3, 12, 20], ['Ojentajat taljalla', 3, 10, 15], ['Ranskalainen punnerrus', 2, 10, 15]] },
      { name: 'Veto', exercises: [
        ['Leuanveto', 3, 6, 10], ['Kulmasoutu', 3, 8, 12], ['Alatalja soutu', 3, 10, 12],
        ['Takaolkapää', 3, 12, 20], ['Hauiskääntö', 3, 10, 15], ['Vasarakääntö', 2, 10, 15]] },
      { name: 'Jalat', exercises: [
        ['Takakyykky', 3, 5, 8], ['Romanian maastaveto', 3, 8, 12], ['Jalkaprässi', 3, 10, 15],
        ['Jalkakoukistus istuen', 3, 10, 15], ['Pohjenousu seisten', 4, 10, 15], ['Vatsarutistus taljalla', 3, 10, 15]] }
    ]
  }
];

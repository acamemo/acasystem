/**
 * OUI blocks (first three bytes of a MAC address) of the makers of televisions, for the list
 * «Televisori in rete» (F5, REP-20261026-006). A device that Home Assistant sees by DHCP shows
 * only its MAC, its host name and its address; the prefix says who made the network card.
 *
 * Source: IEEE Registration Authority, MA-L assignments, https://standards-oui.ieee.org/oui/oui.csv
 * read on 2026-10-27. Kept: Samsung Electronics, LG Electronics (not the mobile unit), Sony
 * (Corporation and its TV and audio units, not Interactive Entertainment or Mobile), TP Vision
 * (Philips televisions), Hisense Visual Technology and Broadband Multimedia, TCL (Shenzhen TCL
 * New Technology, TCL King Electrical), Panasonic AVC Networks and Entertainment, Roku, Vizio.
 * Left out on purpose: Apple, Google, Amazon and Xiaomi, whose prefixes cover phones, speakers
 * and routers as much as televisions (those are recognised by what they say, not by the prefix).
 *
 * A prefix can belong to a maker's phone or appliance too (Samsung makes many): the host name
 * filter in tvClassify.ts removes the obvious ones, and the person always confirms which device
 * is the television. Lower case, six hex digits, no separators.
 */

export type TvOuiBrand =
  | 'samsung'
  | 'lg'
  | 'sony'
  | 'philips'
  | 'hisense'
  | 'tcl'
  | 'panasonic'
  | 'roku'
  | 'vizio';

const OUI_BLOCKS: Readonly<Record<TvOuiBrand, readonly string[]>> = {
  samsung: [
    // 910 blocks
    '0000f0', '0007ab', '001247', '0012fb', '001377', '001599', '0015b9', '001632', '00166b', '00166c',
    '0016db', '0017c9', '0017d5', '0018af', '001a8a', '001b98', '001c43', '001d25', '001df6', '001e7d',
    '001ee1', '001ee2', '001fcc', '001fcd', '00214c', '0021d1', '0021d2', '002339', '00233a', '002399',
    '0023d6', '0023d7', '002454', '002490', '002491', '0024e9', '002538', '002566', '002567', '00265d',
    '00265f', '002b70', '006f64', '0073e0', '007c2d', '007d3b', '008701', '00b5d0', '00bf61', '00c3f4',
    '00e3b2', '00f46f', '00fa21', '04180f', '041bba', '04292e', '04b1a1', '04b429', '04b9e3', '04ba8d',
    '04bdbf', '04cb01', '04e4b6', '04fe31', '08023c', '0808c2', '081093', '0821ef', '08373d', '083d88',
    '087808', '088c2c', '08a5df', '08aed6', '08bfa0', '08d42b', '08eca9', '08ee8b', '08fc88', '08fd0e',
    '0c02bd', '0c1420', '0c2fb0', '0c323a', '0c715d', '0c8910', '0c8dca', '0ca8a7', '0cb319', '0cdfa4',
    '0ce0dc', '1007b6', '101dc0', '1029ab', '102b41', '103047', '103917', '103b59', '1077b1', '1089fb',
    '108ee0', '109266', '10abc9', '10d38a', '10d542', '10e4c2', '10ec81', '140152', '140b9e', '141f78',
    '1432d1', '14568e', '1489fd', '1496e5', '149f3c', '14a364', '14a6b9', '14b484', '14bb6e', '14e01d',
    '14f42a', '1816c9', '1819d6', '181eb0', '182195', '18227e', '182654', '182666', '183a2d', '183f47',
    '184617', '184e16', '184ecb', '1854cf', '185bb3', '1867b0', '1869d4', '188331', '18895b', '18ab1d',
    '18b83d', '18bfb3', '18ce94', '18e2c2', '1c232c', '1c3576', '1c3ade', '1c5a3e', '1c62b8', '1c66aa',
    '1c76f2', '1c869a', '1caf05', '1caf4a', '1ce57f', '1ce61d', '1cf8d0', '2013e0', '2015de', '202680',
    '202d07', '20326c', '203b67', '205531', '205ef7', '206e9c', '20cc73', '20d390', '20d5bf', '20dbab',
    '240935', '240a3f', '241153', '2424b7', '244b03', '244b81', '245ab5', '2460b3', '246800', '2468b0',
    '24920e', '24a452', '24c613', '24c696', '24dbed', '24f0d3', '24f40a', '24f5aa', '24fce5', '2802d8',
    '280708', '2827bf', '28395e', '283dc2', '2872c6', '288335', '28987b', '289f04', '28af42', '28bab5',
    '28cc01', '28de1c', '28e6a9', '2c15bf', '2c4053', '2c4401', '2c9975', '2cae2b', '2cbaba', '2cda46',
    '301966', '306222', '306a85', '307467', '3096fb', '30c7ae', '30c9cc', '30cbf8', '30cda7', '30d587',
    '30d6c9', '30de52', '34145f', '342d0d', '343111', '3482c5', '348a7b', '34aa8b', '34be00', '34c232',
    '34c3ac', '34e3fb', '34f043', '34f084', '380195', '380a94', '380b40', '3816d1', '382dd1', '382de8',
    '384a80', '3868a4', '386a77', '388a06', '388cef', '388f30', '389496', '389af6', '38d40b', '38ece4',
    '3c0518', '3c0a7a', '3c195e', '3c20f6', '3c2983', '3c318a', '3c576c', '3c5a37', '3c6200', '3c8bfe',
    '3ca10d', '3cbbfd', '3cdcbc', '3cf7a4', '4011c3', '40163b', '4035e6', '405ef6', '40d3ae', '40de24',
    '4416fa', '444e1a', '44552b', '445ce9', '446d6c', '44783e', '44c63c', '44ea30', '44f459', '48137e',
    '4827ea', '483f72', '4844f7', '4849c7', '485169', '4861ee', '48794d', '489a58', '489dd1', '48bce1',
    '48c796', '48ef1c', '4c2e5e', '4c3946', '4c3c16', '4c5739', '4c66a6', '4ca56d', '4cbca5', '4cc95e',
    '4cdd31', '4cebb0', '4cecee', '5001bb', '503275', '503da1', '5049b0', '5050a4', '5056bf', '507705',
    '508569', '5092b9', '509ea7', '50a4c8', '50b7c3', '50c8e5', '50ddab', '50f0d3', '50f520', '50fc9f',
    '54104f', '54219d', '543ad6', '5440ad', '5444a3', '5492be', '549b12', '54b802', '54bd79', '54d17d',
    '54dd4f', '54f201', '54fa3e', '54fcf0', '582071', '5879e0', '58a639', '58b10f', '58c38b', '58c5cb',
    '5c10c5', '5c2e59', '5c3c27', '5c497d', '5c5136', '5c5181', '5c5e0a', '5c865c', '5c9960', '5cac3d',
    '5cc1d7', '5ccb99', '5cd33d', '5cdc49', '5ce8eb', '5cedf4', '5cf6dc', '603aaf', '60684e', '606bbd',
    '6077e2', '607fcb', '608e08', '608f5c', '609578', '60a10a', '60a4d0', '60af6d', '60b4a2', '60c5ad',
    '60d0a9', '60ff12', '64037f', '6407f6', '6417cd', '641b2f', '641cae', '641cb0', '6456b5', '645df4',
    '6466d8', '646cb2', '647791', '647bce', '6489f1', '64ace0', '64b310', '64b5f2', '64b853', '64d0d6',
    '64e7d8', '680571', '682737', '684898', '684ae9', '685acf', '6872c3', '687d6b', '687dac', '68bfc4',
    '68dfe4', '68e7c2', '68ebae', '68fcca', '6c006b', '6c2f2c', '6c2f8a', '6c5563', '6c70cb', '6c8336',
    '6cacc2', '6cb7f4', '6cddbc', '6cf373', '700971', '701f3c', '70288b', '702ad5', '704ee0', '705aac',
    '70b13d', '70ce8c', '70f927', '70fd46', '74190a', '741eb1', '74458a', '746dfa', '748b23', '749ef5',
    '74eb80', '74f441', '74f67a', '78009e', '781fdb', '782327', '7825ad', '7833c6', '783716', '7840e4',
    '7846d4', '78471d', '7849d7', '78521a', '78595e', '786089', '789ed0', '78a873', '78abbb', '78b6fe',
    '78bdbc', '78c11d', '78c3e9', '78e0c5', '78f238', '78f7be', '7c0a3f', '7c0bc6', '7c1c68', '7c2302',
    '7c2edd', '7c38ad', '7c6456', '7c752d', '7c787e', '7c7bbf', '7c8956', '7c8bb5', '7c9122', '7cc225',
    '7cf854', '7cf90e', '800794', '800d3f', '8018a7', '801970', '8020fd', '8031f0', '80398c', '804786',
    '804e70', '804e81', '80542d', '80549c', '805719', '80656d', '8075bf', '807b3e', '8086d9', '808943',
    '808abd', '809ff5', '80ceb9', '84119e', '841985', '842289', '8425db', '842e27', '8437d5', '845181',
    '8455a5', '845f04', '849866', '84a466', '84b541', '84c0ef', '84eee4', '88299c', '885e54', '887598',
    '888322', '889b39', '889f6f', '88a303', '88add2', '88bd45', '8c1abf', '8c2e72', '8c6a3b', '8c71f8',
    '8c7712', '8c79f5', '8c83e1', '8c9885', '8ca3ec', '8cbfa6', '8cc5d0', '8cc8cd', '8cdee6', '8ce5c0',
    '8cea48', '9000db', '900628', '900a48', '90633b', '906989', '908175', '9097f3', '90b144', '90b622',
    '90eec7', '90f1aa', '90f80c', '9401c2', '942ddc', '94350a', '945103', '945244', '9463d1', '9476b7',
    '947be7', '948bc1', '94b10a', '94b43a', '94d771', '94e129', '94e6ba', '98063c', '980d6f', '981dfa',
    '982d68', '98398e', '983fe8', '984e8a', '9852b1', '9880ee', '988389', '98b08b', '98b8bc', '98d742',
    '98fb27', '9c0298', '9c2595', '9c2a83', '9c2e7a', '9c3928', '9c3aaf', '9c5fb0', '9c65b0', '9c73b1',
    '9c8306', '9c8c6e', '9ca513', '9cd35b', '9ce063', '9ce6e7', '9cf27e', 'a00798', 'a01081', 'a01b9e',
    'a02195', 'a027b6', 'a0562c', 'a06090', 'a07591', 'a07d9c', 'a0821f', 'a0ac69', 'a0b0bd', 'a0b4a5',
    'a0cbfd', 'a0d05b', 'a0d722', 'a0d7f3', 'a407b6', 'a4307a', 'a46cf1', 'a475b9', 'a48431', 'a49a58',
    'a49ddd', 'a49fe7', 'a4a490', 'a4c69a', 'a4d990', 'a4ebd3', 'a80600', 'a816d0', 'a82bb9', 'a830bc',
    'a8346a', 'a84b4d', 'a8515b', 'a87650', 'a8798d', 'a87c01', 'a88195', 'a887b3', 'a89fba', 'a8ba69',
    'a8d162', 'a8ee67', 'a8f274', 'ac1e92', 'ac3613', 'ac5322', 'ac5a14', 'ac6c90', 'ac80fb', 'acafb9',
    'acc33a', 'acee9e', 'b047bf', 'b04a6a', 'b05476', 'b064e0', 'b06fe0', 'b099d7', 'b0c4e7', 'b0c559',
    'b0d09c', 'b0de31', 'b0df3a', 'b0e45c', 'b0ec71', 'b0f2f6', 'b40b1d', 'b41584', 'b41a1d', 'b43a28',
    'b440dc', 'b46293', 'b47064', 'b47443', 'b49d02', 'b4bff6', 'b4ce40', 'b4d5e5', 'b4ef39', 'b857d8',
    'b85a73', 'b85e7b', 'b86ce8', 'b8a0b8', 'b8a825', 'b8b409', 'b8bbaf', 'b8bc5b', 'b8c68e', 'b8d9ce',
    'bc0eab', 'bc107b', 'bc1485', 'bc20a4', 'bc277a', 'bc32b2', 'bc4486', 'bc455b', 'bc4760', 'bc5274',
    'bc5451', 'bc72b1', 'bc765e', 'bc79ad', 'bc7abf', 'bc7e8b', 'bc851f', 'bc9307', 'bca080', 'bca58b',
    'bcb1f3', 'bcb2cc', 'bcd11f', 'bce63f', 'bcebe8', 'bcf730', 'c01173', 'c0174d', 'c0238d', 'c03d03',
    'c048e6', 'c06599', 'c07ad6', 'c087eb', 'c08997', 'c0bdc8', 'c0d2dd', 'c0d3c0', 'c0d5e2', 'c0dcda',
    'c418e9', 'c41c07', 'c44202', 'c45006', 'c4576e', 'c45d83', 'c462ea', 'c4731e', 'c47764', 'c47d9f',
    'c488e5', 'c493d9', 'c4ae12', 'c4ef3d', 'c8120b', 'c81479', 'c819f7', 'c83870', 'c85142', 'c87e75',
    'c8908a', 'c8a6ef', 'c8a823', 'c8bd4d', 'c8bd69', 'c8d7b0', 'cc051b', 'cc07ab', 'cc20ac', 'cc2119',
    'cc464e', 'cc6ea4', 'ccb11a', 'cce686', 'cce9fa', 'ccf826', 'ccf9e8', 'ccf9f0', 'ccfe3c', 'd003df',
    'd004b0', 'd0176a', 'd01b49', 'd03169', 'd039fa', 'd056fb', 'd059e4', 'd0667b', 'd07fa0', 'd087e2',
    'd0b128', 'd0c1b1', 'd0c24e', 'd0d003', 'd0dfc7', 'd0fccc', 'd411a3', 'd42ca6', 'd47ae2', 'd487d8',
    'd48890', 'd48a39', 'd49dc0', 'd4ae05', 'd4e6b7', 'd4e8b2', 'd80831', 'd80b9a', 'd831cf', 'd85575',
    'd857ef', 'd85b2a', 'd868a0', 'd868c3', 'd87154', 'd890e8', 'd89d13', 'd8a35c', 'd8c4e9', 'd8e0e1',
    'dc44b6', 'dc6672', 'dc69e2', 'dc74a8', 'dc87f8', 'dc8983', 'dc9ded', 'dcc49c', 'dccce6', 'dccf96',
    'dcdce2', 'dcf756', 'e0036b', 'e09971', 'e09d13', 'e0aa96', 'e0c377', 'e0cbee', 'e0d083', 'e0db10',
    'e41088', 'e4121d', 'e432cb', 'e440e2', 'e458b8', 'e458e7', 'e45d75', 'e47cf9', 'e47dbd', 'e49282',
    'e492fb', 'e49f7d', 'e4a430', 'e4b021', 'e4e0c5', 'e4ece8', 'e4f3c4', 'e4f8ef', 'e4faed', 'e8039a',
    'e81132', 'e83a12', 'e84e84', 'e85497', 'e86dcb', 'e87f6b', 'e89309', 'e8aacb', 'e8b4c8', 'e8c913',
    'e8e5d6', 'ec107b', 'ec7cb6', 'ec90c1', 'ecaa25', 'ecb550', 'ece09b', 'f0051b', 'f008f1', 'f03965',
    'f05a09', 'f05b7b', 'f065ae', 'f067b1', 'f06bca', 'f0704f', 'f0728c', 'f08a76', 'f0cd31', 'f0e426',
    'f0e77e', 'f0ee10', 'f0f564', 'f400a2', 'f40e22', 'f42b8c', 'f4428f', 'f47190', 'f47b5e', 'f47def',
    'f49f54', 'f4c248', 'f4d9fb', 'f4dd06', 'f4f309', 'f4fefb', 'f83f51', 'f84e58', 'f85b6e', 'f877b8',
    'f884f2', 'f88f07', 'f8d0bd', 'f8e61a', 'f8f1e6', 'fc039f', 'fc1910', 'fc1a46', 'fc4203', 'fc643a',
    'fc6e83', 'fc8f90', 'fc936b', 'fca13e', 'fca621', 'fcaab6', 'fcc734', 'fcde90', 'fce5f0', 'fcf136',
  ],
  lg: [
    // 36 blocks
    '00a159', '00e091', '046f00', '14c913', '201742', '300eb8', '30b4b8', '388c50', '3cbdd8', '3ccd93',
    '40538c', '58960a', '58fdb1', '60756c', '64956c', '64e4a5', '6cd032', '74c17e', '74e6b8', '785dc8',
    '7c646c', '8c5646', '9893cc', 'a823fe', 'ac5af0', 'b03795', 'b4b291', 'b4e3d0', 'c041f6', 'c808e9',
    'cc2d8c', 'd0cdbf', 'd84fb8', 'e85b5b', 'f801b4', 'f83869',
  ],
  sony: [
    // 92 blocks
    '00014a', '000ad9', '000e07', '000fde', '0012ee', '0013a9', '001620', '0016b8', '001813', '001963',
    '001a75', '001a80', '001b59', '001ca4', '001d28', '001dba', '001e45', '001edc', '001fe4', '00219e',
    '002298', '002345', '0023f1', '0024be', '0024ef', '0025e7', '00eb2d', '045d4b', '080046', '104fa8',
    '143fa6', '18002d', '1c7b21', '205476', '2421ab', '283f69', '3017c8', '303926', '307512', '30a8db',
    '30f9ed', '38184c', '387862', '3c01ef', '3c0771', '3c38f4', '402ba1', '4040a7', '40b837', '44746c',
    '44d4e0', '4c21d0', '50125c', '54263d', '544249', '5453ed', '58170c', '581862', '584822', '5cb524',
    '68764f', '6c0e0d', '6c23b9', '6cb227', '702605', '78843c', '8099e7', '8400d2', '848edf', '84c7ea',
    '88c9e8', '8c6422', '90c115', '94ce2c', '94db56', '9c5cf9', 'a0e453', 'ac800a', 'ac9b0a', 'b4527d',
    'b4527e', 'b8f934', 'bc6e64', 'c43abe', 'cc988b', 'd05162', 'd4389c', 'd8d43c', 'e063e5', 'f0bf97',
    'f84e17', 'fcf152',
  ],
  philips: [
    // 4 blocks
    '0ccafb', '188ed5', '68070a', '70af24',
  ],
  hisense: [
    // 20 blocks
    '08674e', '08ba5f', '10394e', '142e43', '20beb4', '64aef1', '74d082', '88b863', '903c1d', 'a0004c',
    'a062fb', 'ac4afe', 'b84dee', 'c40826', 'c48ace', 'cc1228', 'dc9a7d', 'e43bc9', 'e48a93', 'fc5703',
  ],
  tcl: [
    // 16 blocks
    '08c3b3', '18acc2', '2ce032', '345180', '382656', '3c591e', '408bf6', '4887b8', '4c4929', '5c36b8',
    '5cad76', '8c0f7e', 'c07982', 'cca12b', 'd065b3', 'd814df',
  ],
  panasonic: [
    // 9 blocks
    '001267', '001bd3', '04209a', '20c6eb', '247823', '705812', '8cc121', 'a81374', 'cc7ee7',
  ],
  roku: [
    // 31 blocks
    '000d4b', '080581', '105932', '20efbd', '306a4f', '345e08', '5006f5', '544ef0', '6092c8', '7c67ab',
    '84eaed', '88dea9', '8c4962', '9cf1d4', 'a8b57c', 'ac3a7a', 'acae19', 'b0a737', 'b0ee7b', 'b83e59',
    'b8a175', 'bcd7d4', 'c83a6b', 'cc6da0', 'd04d2c', 'd4bedc', 'd4e22f', 'd83134', 'dc3a5e', 'ec9b75',
    'f8b22c',
  ],
  vizio: [
    // 18 blocks
    '00199d', '006b9e', '00bd3e', '0c8b7d', '14c67d', '14cce7', '201ba5', '24ee5d', '2c641f', '3c9bd6',
    '80051f', 'a06a44', 'a48d3b', 'c41cff', 'cc95d7', 'd4ab9f', 'e838a0', 'f04fe0',
  ],
};

const BRAND_BY_OUI: ReadonlyMap<string, TvOuiBrand> = new Map(
  (Object.entries(OUI_BLOCKS) as [TvOuiBrand, readonly string[]][]).flatMap(([brand, blocks]) =>
    blocks.map((block): [string, TvOuiBrand] => [block, brand])
  )
);

/** The television maker that owns the prefix of this MAC (`aa:bb:cc:dd:ee:ff`), or null. */
export const brandForMac = (mac: string): TvOuiBrand | null =>
  BRAND_BY_OUI.get(mac.replace(/[^0-9a-f]/gi, '').slice(0, 6).toLowerCase()) ?? null;

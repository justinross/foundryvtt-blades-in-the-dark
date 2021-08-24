# FoundryVTT Blades in the Dark character and crew sheets

## Redesign features:
A mini view of essential character data keeps essential data easily-accessed and compact:

![image](https://user-images.githubusercontent.com/1120106/130698986-4c28509a-8643-4e8d-af63-250d517a5e92.png)

Hover over items in the list of purchased skills to see the skill description:

![image](https://user-images.githubusercontent.com/1120106/130699030-89ff398a-a854-46e3-b75f-3a92676c429c.png)

Harm and Coins are easily accessed via clickable popups by the character portrait:

![image](https://user-images.githubusercontent.com/1120106/130699095-dd25bc35-5741-44fb-aadc-01ef08f5f7b6.png) ![image](https://user-images.githubusercontent.com/1120106/130699077-cdaf61ce-4786-4372-a2aa-455278cf2b0d.png) 

Click any already-selected tracker to toggle it off (so if your xp is at "1", just click the highlighted marker to set it back to zero)
Resize the character sheet to see full details, including abilities, friends, items, and XP prompts:

![image](https://user-images.githubusercontent.com/1120106/130699183-aef67137-eb19-49b3-a23e-ec0f3f472bcb.png)

Click the face next to a friend to change your status with them:

![image](https://user-images.githubusercontent.com/1120106/130699258-e80f0e57-9d8e-4cad-acff-18065bba3ebd.png)

Right-click an item or ability to delete it
Right-click the Special Abilities or Items titles to add new abilities/items (for, say, picking a Veteran skill)
Or, just drag an ability or item from the appropriate compendium
With the lock button (top right corner) unlocked, all character data, abilities, playbook, and items are editable, with many editable in-place:

![image](https://user-images.githubusercontent.com/1120106/130699475-028e8ac5-e1ad-4ad4-9ffc-9240c123f75d.png)

![image](https://user-images.githubusercontent.com/1120106/130699522-3d17a780-fcba-4434-80b5-279af2c44fb3.png)

The lock button also controls editing of the notes tab, which has basic markdown support, as well:

![image](https://user-images.githubusercontent.com/1120106/130699672-00b4bd31-91c9-43d3-be51-32012b0ec4b1.png)

![image](https://user-images.githubusercontent.com/1120106/130699688-9839039d-5878-45db-b5f7-ab3e9f52c875.png)

**Note: changing your playbook will reset your purchased skills and action points.**






## Original repo readme below:
If you like my work - send thanks to astromortis@gmail.com  :3
... or donations to https://www.donationalerts.com/r/megastruktur

Contact Discord: `megastruktur#5704` in case you find any bugs or if you have any suggestions.

## Usage
`"Item" - all classes, crew types, upgrades, items, abilities, upgrades, etc.`

- To reset reputation, exp, etc counters just click on the label name.
- Health clock can be reset by clicking on "Healing" table header.
- To add items you can click a corresponding link or drag items from compendium/game to the sheet.
- All "class/crew" specific items are prefixed with first letters

- I don't want the "class/crew items" to be prepopulated, so the character sheet contains less "compendium" info.
- To see the description of Class, Vice, Background, etc you can just click added item and see all the info in the popup.
- When adding a new item you can hower a "question-circle" icon to see the item's description.
- To add Custom abilities just add a new "Foundry Item" of the corresponding type and fill all the necessary info. Then drag it to the sheet or add via button on a sheet.

Classes:
- (C)  Cutter
- (G)  Ghost
- (H)  Hound
- (Hu) Hull
- (Le) Leech
- (Lu) Lurk
- (Sl) Slide
- (Sp) Spider
- (V)  Vampire
- (W)  Whisper

Crew Types:
- (A)  Assassins
- (B)  Bravos
- (C)  Cult
- (H)  Hawkers
- (Sh) Shadows
- (Sm) Smugglers

## Screenshots

### Character Sheet, Crew Sheet and Class
![alt screen][screenshot_all]

### Compendium
![alt screen][screenshot_compendium]

### Rolls
![alt screen][screenshot_roll_1]
![alt screen][screenshot_roll_2]

## Clocks
Clocks are now here!
- To add clock go to Actors tab and create a new Actor of type "🕛 clock".
- To share it to other players just drag it to a scene.

### Operators list
- `addition` - is added when item is attached and substracted when removed
- `attribute_change` - changes the "attribute" to value and when removed - uses the "attribute_default" to restore

## To be done in the nearest future
- Friends/rivals section
- Stress/Harm dynamic values (can be modified by abilities but for now are hardcoded)

## Troubleshooting
- If you can't find the drag-n-dropped item, refer to "All Items" tab on each sheet.

## Credits
- This work is based on Blades in the Dark (found at http://www.bladesinthedark.com/), product of One Seven Design, developed and authored by John Harper, and licensed for our use under the Creative Commons Attribution 3.0 Unported license (http://creativecommons.org/licenses/by/3.0/).
- Some assets were taken from here (thank you  timdenee and joesinghaus): https://github.com/joesinghaus/Blades-in-the-Dark


[screenshot_all]: ./images/screenshot_all.png "screenshot_all"
[screenshot_compendium]: ./images/screenshot_compendium.png "screenshot_compendium"
[screenshot_roll_1]: ./images/screenshot_roll_1.png "screenshot_roll_1"
[screenshot_roll_2]: ./images/screenshot_roll_2.png "screenshot_roll_2"

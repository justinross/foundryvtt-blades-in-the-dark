
import { BladesSheet } from "./blades-sheet.js";
// import {onManageActiveEffect, prepareActiveEffectCategories} from "./effects.js";
import { BladesActiveEffect } from "./blades-active-effect.js";
import { BladesHelpers } from "./blades-helpers.js";
import { migrateWorld } from "./migration.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {BladesSheet}
 */
export class BladesActorSheet extends BladesSheet {

  /** @override */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
  	  classes: ["blades-in-the-dark", "sheet", "actor", "pc"],
  	  template: "systems/blades-in-the-dark/templates/actor-sheet.html",
      width: 800,
      height: 1200,
      tabs: [{navSelector: ".tabs", contentSelector: ".tab-content", initial: "playbook"}]
    });
  }

  async _onDropItem(event, droppedItem) {
    if (!this.actor.isOwner) {
      ui.notifications.error(`You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.`, {permanent: true});
      return false;
    }
	  await this.handleDrop(event, droppedItem);
    return super._onDropItem(event, droppedItem);
  }

  async _onDropActor(event, droppedActor){
    if (!this.actor.isOwner) {
      ui.notifications.error(`You do not have sufficient permissions to edit this character. Please speak to your GM if you feel you have reached this message in error.`, {permanent: true});
      return false;
    }
    await this.handleDrop(event, droppedActor);
    return super._onDropActor(event, droppedActor);
  }

  async handleDrop(event, droppedEntity){
    let droppedEntityFull;
    //if the dropped entity is from a compendium, get the full entity from there
    if("pack" in droppedEntity){
      droppedEntityFull = await game.packs.get(droppedEntity.pack).getDocument(droppedEntity.id);
    }
    //otherwise get it from the world
    else{
      switch(droppedEntity.type){
        case "Actor":
          droppedEntityFull = game.actors.find(actor=> actor.id === droppedEntity.id);
          break;
        case "Item":
          droppedEntityFull = game.items.find(actor=> actor.id === droppedEntity.id);
          break;
      }
    }
    switch (droppedEntityFull.type) {
      case "npc":
        await this.actor.addAcquaintance(droppedEntityFull);
        break;
      case "item":
        break;
      case "ability":
        break;
      default:
        await this.actor.replaceDistinctItems(droppedEntityFull);
        // await this.onDroppedDistinctItem(droppedEntityFull);
        break;
    }
  }

  async generateAddExistingItemDialog(item_type){
    let all_items = await BladesHelpers.getSourcedItemsByType(item_type);
    all_items = BladesHelpers.filterItemsForDuplicatesOnActor(all_items, item_type, this.actor, true);
    let grouped_items = {};

    let items_html = '<div class="items-list">';
    let sorted_grouped_items = BladesHelpers.groupItemsByClass(all_items);

    for (const [itemclass, group] of Object.entries(sorted_grouped_items)) {
      items_html += `<div class="item-group"><header>${itemclass}</header>`;
      for (const item of group) {
        let trimmedname = BladesHelpers.trimClassFromName(item.name);
        items_html += `
            <div class="item-block">
              <input type="checkbox" id="character-${this.actor.id}-${item_type}add-${item.id}" data-${item_type}-id="${item.id}" >
              <label for="character-${this.actor.id}-${item_type}add-${item.id}" title="${item.data.data.description}" class="hover-term">${trimmedname}</label>
            </div>
          `;
      }
      items_html += '</div>';
    }

    items_html += '</div>';

    let d = new Dialog({
      title: game.i18n.localize("BITD.AddExisting" + BladesHelpers.capitalizeFirstLetter(item_type)),
      content:  `<h3>${game.i18n.localize("BITD.SelectToAdd" + BladesHelpers.capitalizeFirstLetter(item_type))}</h3>
                    ${items_html}
                    `,
      buttons: {
        add: {
          icon: "<i class='fas fa-check'></i>",
          label: game.i18n.localize("BITD.Add"),
          callback: async (html)=> {
            let itemInputs = html.find("input:checked");
            let items = [];
            for (const itemelement of itemInputs) {
              let item = await BladesHelpers.getItemByType(item_type, itemelement.dataset[item_type + "Id"]);
              items.push(item.data);
            }
            this.actor.createEmbeddedDocuments("Item", items);
          }
        },
        cancel: {
          icon: "<i class='fas fa-times'></i>",
          label: game.i18n.localize("BITD.Cancel"),
          callback: ()=> close()
        }
      },
      render: (html) => {
        this.addTermTooltips(html);
      },
      close: (html) => {

      }
    }, {classes:["add-existing-dialog"], width: "650"});
    d.render(true);
  }



  itemContextMenu = [
    {
      name: game.i18n.localize("BITD.TitleDeleteItem"),
      icon: '<i class="fas fa-trash"></i>',
      callback: element => {
        this.actor.deleteEmbeddedDocuments("Item", [element.data("item-id")]);
      }
    }
  ];

  itemListContextMenu = [
    {
      name: game.i18n.localize("BITD.AddNewItem"),
      icon: '<i class="fas fa-plus"></i>',
      callback: async (element) => {
        await this.addNewItem();
      }
    },
    {
      name: game.i18n.localize("BITD.AddExistingItem"),
      icon: '<i class="fas fa-plus"></i>',
      callback: async (element) => {
        await this.generateAddExistingItemDialog("item", this.actor);
      }
    }
  ];

  traumaListContextMenu = [
    {
      name: game.i18n.localize("BITD.DeleteTrauma"),
      icon: '<i class="fas fa-trash"></i>',
      callback: element => {
        let traumaToDisable = element.data("trauma");
        let traumaUpdateObject = this.actor.data.data.trauma.list;
        let index = traumaUpdateObject.indexOf(traumaToDisable.toLowerCase());
        traumaUpdateObject.splice(index, 1);
        this.actor.update({data:{trauma:{list: traumaUpdateObject}}});
      }
    }
  ];

  abilityContextMenu = [
    {
      name: game.i18n.localize("BITD.DeleteAbility"),
      icon: '<i class="fas fa-trash"></i>',
      callback: element => {
        this.actor.deleteEmbeddedDocuments("Item", [element.data("ability-id")]);
      }
    }
  ];

  acquaintanceContextMenu = [
    {
      name: game.i18n.localize("BITD.DeleteItem"),
      icon: '<i class="fas fa-trash"></i>',
      callback: element => {
        this.actor.removeAcquaintance(element.data("acquaintance"));
        // this.actor.deleteEmbeddedDocuments("Item", [element.data("ability-id")]);
      }
    }
  ];


  abilityListContextMenu = [
    {
      name: game.i18n.localize("BITD.AddNewAbility"),
      icon: '<i class="fas fa-plus"></i>',
      callback: async (element) => {
        await this.addNewAbility();
      }
    },
    {
      name: game.i18n.localize("BITD.AddExistingAbility"),
      icon: '<i class="fas fa-plus"></i>',
      callback: async (element) => {
        await this.generateAddExistingItemDialog("ability", this.actor);
      }
    }
  ];

  async addNewItem(){
      let playbook_name = "custom";
      let item_data_model = game.system.model.Item.item;
      let new_item_data = { name : "New Item", type : "item", data : {...item_data_model} };
      new_item_data.data.class = "custom";
      new_item_data.data.load = 1;

      let new_item = await this.actor.createEmbeddedDocuments("Item", [new_item_data], {renderSheet : true});
      return new_item;
  }

  async addNewAbility(){
    let playbook_name = "custom";
    let ability_data_model = game.system.model.Item.ability;
    let new_ability_data = { name : "New Ability", type : "ability", data : {...ability_data_model} };
    new_ability_data.data.class = "custom";

    let new_ability = await this.actor.createEmbeddedDocuments("Item", [new_ability_data], {renderSheet : true});
    return new_ability;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    let data = super.getData();
    data.editable = this.options.editable;
    data.isGM = game.user.isGM;
    const actorData = data.data;
    data.actor = actorData;
    data.data = actorData.data;

    // Prepare active effects
    data.effects = BladesActiveEffect.prepareActiveEffectCategories(this.actor.effects);

    // Calculate Load
    let loadout = 0;
    data.items.forEach(i => {
      loadout += (i.type === "item" && i.data.equipped) ? parseInt(i.data.load) : 0});
    data.data.loadout = loadout;

    // Encumbrance Levels
    let load_level=["BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Normal","BITD.Normal","BITD.Heavy","BITD.Encumbered",
			"BITD.Encumbered","BITD.Encumbered","BITD.OverMax"];
    let mule_level=["BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Light","BITD.Normal","BITD.Normal",
			"BITD.Heavy","BITD.Encumbered","BITD.OverMax"];
    let mule_present=0;

    //Sanity Check
    if (loadout < 0) {
      loadout = 0;
    }
    if (loadout > 10) {
      loadout = 10;
    }

    //look for Mule ability
    // @todo - fix translation.
    data.items.forEach(i => {
      if (i.type === "ability" && i.name === "(C) Mule" && i.data.purchased) {
        mule_present = 1;
      }
    });

    //set encumbrance level
    if (mule_present) {
      data.data.load_level=mule_level[loadout];
    } else {
      data.data.load_level=load_level[loadout];
    }

    switch (data.data.selected_load_level){
      case "BITD.Light":
        data.max_load = data.data.base_max_load + 3;
        break;
      case "BITD.Normal":
        data.max_load = data.data.base_max_load + 5;
        break;
      case "BITD.Heavy":
        data.max_load = data.data.base_max_load + 6;
        break;
      default:
        data.data.selected_load_level = "BITD.Normal";
        data.max_load = data.base_max_load + 5;
        break;
    }

    data.load_levels = {"BITD.Light":"BITD.Light", "BITD.Normal":"BITD.Normal", "BITD.Heavy":"BITD.Heavy"};

    //load up playbook options/data for playbook select
    // data.playbook_options = await game.packs.get("blades-in-the-dark.class").getIndex();
    data.playbook_options = await BladesHelpers.getSourcedItemsByType("class");
    data.playbook_select = this.prepIndexForHelper(data.playbook_options);

    if(data.data.playbook !== ""){
      data.selected_playbook_full = await BladesHelpers.getItemByType("class", data.data.playbook);
      if(typeof data.selected_playbook_full != "undefined"){
        data.selected_playbook_name = data.selected_playbook_full.name;
        data.selected_playbook_description = data.selected_playbook_full.data.data.description;
      }
    }
    let available_abilities = data.items.filter(item => item.type == "ability" );

    //hide the playbook abbreviations for display
    data.available_abilities = available_abilities.map(item => {
      item.name = item.name.replace(/\([^)]*\)\s/, "");
      return item;
    });

    data.available_abilities = data.available_abilities.sort((a, b) => {
      if(a.name == "Veteran"){
        return 1;
      }
      if(b.name == "Veteran"){
        return -1;
      }
      if(a.name == b.name){ return 0; }
      return a.name > b.name ? 1 : -1;
    });

    let my_abilities = data.items.filter(ability => ability.type == "ability" && ability.data.purchased);
    data.my_abilities = my_abilities;

    // let playbook_items = data.items.filter(item => item.type == "item" && item.data.class == data.selected_playbook_name);
    let my_items = data.items.filter(item => item.type == "item" && item.data.class != "");

    //hide the playbook abbreviations for display
    data.my_items = my_items.map(item => {
      item.name = item.name.replace(/\([^)]*\)\s/, "")
      return item;
    });
    data.generic_items = data.items.filter(item => item.type == "item" && item.data.class == "");

    // data.ownedTraumas = [];
    // if(data.data.trauma.list.length > 0){
    //   for (const trauma in data.data.trauma.list){
    //     console.log(trauma);
    //     if(data.data.trauma.list[trauma]){
    //       data.ownedTraumas.push(trauma.charAt(0).toUpperCase() + trauma.slice(1));
    //     }
    //   }
    // }

    return data;
  }

  prepIndexForHelper(index){
    let prepped = {};
    if(index){
      index.forEach(item => prepped[item.id] = item.name);
    }
    return prepped;
  }

  addTermTooltips(html){
    html.find('.hover-term').hover(function(e){ // Hover event
      var titleText;
      if(e.target.title == ""){
        titleText = BladesLookup.getTerm($(this).text());
      }
      else{
        titleText = e.target.title;
      }
      $(this).data('tiptext', titleText).removeAttr('title');
      $('<p class="tooltip"></p>').text(titleText).appendTo('body').css('top', (e.pageY - 10) + 'px').css('left', (e.pageX + 20) + 'px').fadeIn('fast');
    }, function(){ // Hover off event
      $(this).attr('title', $(this).data('tiptext'));
      $('.tooltip').remove();
    }).mousemove(function(e){ // Mouse move event
      $('.tooltip').css('top', (e.pageY - 10) + 'px').css('left', (e.pageX + 20) + 'px');
    });
  }

  async showPlaybookChangeDialog(changed){
    let modifications = await this.actor.modifiedFromPlaybookDefault(this.actor.data.data.playbook);
    return new Promise(async (resolve, reject)=>{
      if(modifications){
        let abilitiesToKeepOptions = {name : "abilities", value:"none", options : {all: "Keep all Abilities", custom: "Keep added abilities", owned: "Keep owned abilities", ghost: `Keep "Ghost" abilities`, none: "Replace all"}};
        let acquaintancesToKeepOptions = {name : "acquaintances", value:"none", options : {all: "All contacts", friendsrivals: "Keep only friends and rivals", custom: "Keep any added contacts", both: "Keep added contacts and friends/rivals", none: "Replace all"}};
        let keepSkillPointsOptions = {name : "skillpoints", value:"reset", options : {keep: "Keep current skill points", reset: "Reset to new playbook starting skill points"}};
        let playbookItemsToKeepOptions = {name : "playbookitems", value: "none", options: {all: "Keep all playbook items", custom: "Keep added items", none: "Replace all"}};
        let selectTemplate = Handlebars.compile(`<select name="{{name}}" class="pb-migrate-options">{{selectOptions options selected=value}}</select>`)
        let dialogContent = `
          <p>Changes have been made to this character that would be overwritten by a playbook switch. Please select how you'd like to handle this data and click "Ok", or click "Cancel" to cancel this change.</p>
          <p>Note that this process only uses the Item, Ability, Playbook, and NPC compendia to decide what is "default". If you have created entities outside the relevant compendia and added them to your character, those items will be considered "custom" and removed unless you choose to save.</p>
          <h2>Changes to keep</h2>
          <div ${modifications.newAbilities || modifications.ownedAbilities ? "" : "hidden"}>
            <label>Abilities to keep</label>
            ${selectTemplate(abilitiesToKeepOptions)}
          </div>
          <div ${modifications.addedItems ? "" : "hidden"}>
            <label>Playbook Items</label>
            ${selectTemplate(playbookItemsToKeepOptions)}
          </div>
          <div ${modifications.skillsChanged ? "" : "hidden"}>
            <label>Skill Points</label>
            ${selectTemplate(keepSkillPointsOptions)}
          </div>
          <div ${modifications.acquaintanceList || modifications.relationships ? "" : "hidden"}>
            <label>Acquaintances</label>
            ${selectTemplate(acquaintancesToKeepOptions)}
          </div>
        `;

        let pbConfirm = new Dialog({
          title: `Change playbook to ${await BladesHelpers.getPlaybookName(changed.data.playbook)}?`,
          content: dialogContent,
          buttons:{
            ok:{
              icon: '<i class="fas fa-check"></i>',
              label: 'Ok',
              callback: async (html)=> {
                let selects = html.find("select.pb-migrate-options");
                let selectedOptions = {};
                for (const select of $.makeArray(selects)) {
                  selectedOptions[select.name] = select.value;
                };
                resolve(selectedOptions);
              }
            },
            cancel:{
              icon: '<i class="fas fa-times"></i>',
              label: 'Cancel',
              callback: ()=> {
                reject();
              }
            }
          },
          close: () => {reject();}
        });
        pbConfirm.render(true);
      }
      else{
        let selectedOptions = {
          "abilities": "none",
          "playbookitems": "none",
          "skillpoints": "reset",
          "acquaintances": "none"
        };
        resolve(selectedOptions);
      }
    });
  }


  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    this.addTermTooltips(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    new ContextMenu(html, ".item-block", this.itemContextMenu);
    new ContextMenu(html, ".ability-block", this.abilityContextMenu);
    new ContextMenu(html, ".context-items > span", this.itemListContextMenu);
    new ContextMenu(html, ".item-list-add", this.itemListContextMenu, {eventName : "click"});
    new ContextMenu(html, ".context-abilities", this.abilityListContextMenu);
    new ContextMenu(html, ".ability-add-popup", this.abilityListContextMenu, {eventName : "click"});
    new ContextMenu(html, ".trauma-item", this.traumaListContextMenu);
    new ContextMenu(html, ".acquaintance", this.acquaintanceContextMenu);

    // // todo - remove
    html.find('.migrate-test').click(async ev => {
      console.log("Testing world migration");
      this.actor.resetMigTest();
      await migrateWorld();
    });

    html.find('.debug-toggle').click(async ev => {
      let debug = await this.actor.getFlag('blades-in-the-dark', 'show-debug');
      await this.actor.setFlag('blades-in-the-dark', 'show-debug', !debug);
    });

    // Update Inventory Item
    html.find('.item-block .clickable-edit').click(ev => {
      ev.preventDefault();
      let itemId = ev.currentTarget.closest(".item-block").dataset.itemId;
      let item = this.actor.items.get(itemId);
      item.sheet.render(true);
    });

    html.find('.ability-block .clickable-edit').click(ev => {
      ev.preventDefault();
      let abilityId = ev.currentTarget.closest(".ability-block").dataset.abilityId;
      let ability = this.actor.items.get(abilityId);
      ability.sheet.render(true);
    });

    // Delete Inventory Item -- not used in new design
    html.find('.delete-button').click( async ev => {
      const element = $(ev.currentTarget);
      await this.actor.deleteEmbeddedDocuments("Item", [element.data("id")]);
      element.slideUp(200, () => this.render(false));
    });

    html.find('.toggle-allow-edit').click(async (event) => {
      event.preventDefault();
      if(this.actor.getFlag('blades-in-the-dark', 'allow-edit')){
        await this.actor.unsetFlag('blades-in-the-dark', 'allow-edit');
      } else {
        await this.actor.setFlag('blades-in-the-dark', 'allow-edit', true);
      }
    });

    html.find('.item-block .main-checkbox').change(ev => {
      let checkbox = ev.target;
      let itemId = checkbox.closest(".item-block").dataset.itemId;
      let item = this.actor.items.get(itemId);
      return item.update({data: {equipped : checkbox.checked}});
    });

    html.find('.item-block .child-checkbox').click(ev => {
      let checkbox = ev.target;
      let $main = $(checkbox).siblings(".main-checkbox");
      $main.trigger('click');
    });

    html.find('.ability-block .main-checkbox').change(ev => {
      let checkbox = ev.target;
      let abilityId = checkbox.closest(".ability-block").dataset.abilityId;
      let ability = this.actor.items.get(abilityId);
      return ability.update({data: {purchased : checkbox.checked}});
    });

    //this could probably be cleaner. Numbers instead of text would be fine, but not much easier, really.
    html.find('.standing-toggle').click(ev => {
      let acquaintances = this.actor.data.data.acquaintances;
      let acqId = ev.target.closest('.acquaintance').dataset.acquaintance;
      let clickedAcqIdx = acquaintances.findIndex(item => item.id == acqId);
      let clickedAcq = acquaintances[clickedAcqIdx];
      let oldStanding = clickedAcq.standing;
      let newStanding;
      switch(oldStanding){
        case "friend":
          newStanding = "neutral";
          break;
        case "rival":
          newStanding = "friend";
          break;
        case "neutral":
          newStanding = "rival";
          break;
      }
      clickedAcq.standing = newStanding;
      acquaintances.splice(clickedAcqIdx, 1, clickedAcq);
      this.actor.update({data: {acquaintances : acquaintances}});
    });

    html.find('.coins-box').click(ev => {
      //note: apparently have to do this via flag, as just adding a class doesn't help when the box get rerendered on data change. Fun. Only downside is that it will probably show the coins opening and closing for anyone else viewing the sheet, too.
      this.actor.getFlag('blades-in-the-dark', 'coins_open') ? this.actor.setFlag('blades-in-the-dark', 'coins_open', false) : this.actor.setFlag('blades-in-the-dark', 'coins_open', true);
    });

    html.find('.coins-box .full-view').click(ev => {
      ev.stopPropagation();
    });

    html.find('.harm-box').click(ev => {
      this.actor.getFlag('blades-in-the-dark', 'harm_open') ? this.actor.setFlag('blades-in-the-dark', 'harm_open', false) : this.actor.setFlag('blades-in-the-dark', 'harm_open', true);
    });

    html.find('.harm-box .full-view').click(ev => {
      ev.stopPropagation();
    });

    html.find('.load-box').click(ev => {
      this.actor.getFlag('blades-in-the-dark', 'load_open') ? this.actor.setFlag('blades-in-the-dark', 'load_open', false) : this.actor.setFlag('blades-in-the-dark', 'load_open', true);
    });

    html.find('.load-box .full-view').click(ev => {
      ev.stopPropagation();
    });

    html.find('.add_trauma').click(ev => {
      let actorTraumaList = this.actor.data.data.trauma.list;
      let allTraumas = ["cold", "haunted", "obsessed", "paranoid", "reckless", "soft", "unstable", "vicious"];
      let unownedTraumas = [];
      for (const traumaListKey of allTraumas) {
        if(!actorTraumaList.includes(traumaListKey)){
          unownedTraumas.push(traumaListKey.charAt(0).toUpperCase() + traumaListKey.slice(1));
        }
      }

      let unownedTraumasOptions;
      unownedTraumas.forEach((trauma)=>{
        unownedTraumasOptions += `<option value=${trauma}>${game.i18n.localize("BITD.Trauma"+trauma)}</option>`;
      });
      let unownedTraumasSelect = `
        <select id="${this.actor.id}-trauma-select">
        ${unownedTraumasOptions}
        </select>
      `;
      let d = new Dialog({
        title: "Add Trauma",
        content: `Select a trauma to add:<br/>${unownedTraumasSelect}`,
        buttons: {
          add: {
            icon: "<i class='fas fa-plus'></i>",
            label: "Add",
            callback: async (html) => {
              let newTrauma = html.find(`#${this.actor.id}-trauma-select`).val().toLowerCase();
              let newTraumaListValue = {
                data:
                  {
                    trauma: this.actor.data.data.trauma
                  }
              };
              newTraumaListValue.data.trauma.list.push(newTrauma);
              await this.actor.update(newTraumaListValue);

            }
          },
          cancel: {
            icon: "<i class='fas fa-times'></i>",
            label: "Cancel"
          },
        },
        render: (html) => {},
        close: (html) => {}
      });
      d.render(true);

    });

    // manage active effects
    html.find(".effect-control").click(ev => BladesActiveEffect.onManageActiveEffect(ev, this.actor));

    html.find(".toggle-expand").click(ev => {
      if(!this._element.hasClass("can-expand")){
        this.setPosition({height: 275});
        this._element.addClass("can-expand");
      }
      else{
        this.setPosition({height: "auto"});
        this._element.removeClass("can-expand");
      }
    });

    // let sheetObserver = new MutationObserver(mutationRecords => {
    //   let element = $(mutationRecords[0].target);
    //   let scrollbox = $(mutationRecords[0].target).find(".window-content").get(0);
    //   let scrollbarVisible = scrollbox.scrollHeight > scrollbox.clientHeight;
    //   if(scrollbarVisible){
    //     element.addClass("can-expand");
    //   }
    //   else{
    //     element.removeClass("can-expand");
    //   }
    // });
    // sheetObserver.observe(this._element.get(0), {childList:false, attributes:true, attributeFilter: ["style"], subtree: false});

  }

  /* -------------------------------------------- */

}

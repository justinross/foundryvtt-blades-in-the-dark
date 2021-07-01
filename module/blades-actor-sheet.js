
import { BladesSheet } from "./blades-sheet.js";
import {onManageActiveEffect, prepareActiveEffectCategories} from "./effects.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {BladesSheet}
 */
export class BladesActorSheet extends BladesSheet {

  /** @override */
	static get defaultOptions() {
	  return foundry.utils.mergeObject(super.defaultOptions, {
  	  classes: ["blades-in-the-dark", "sheet", "actor"],
  	  template: "systems/blades-in-the-dark/templates/actor-sheet.html",
      width: 800,
      height: 1200,
      tabs: [{navSelector: ".tabs", contentSelector: ".tab-content", initial: "playbook"}]
    });
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
      name: game.i18n.localize("BITD.AddItem"),
      icon: '<i class="fas fa-plus"></i>',
      callback: async (element) => {
        await this.addNewItem();
        // let all_items = await game.packs.get("blades-in-the-dark.item").getDocuments();
        // let items_html = '<ul>';
        // all_items.sort((a, b) => a.name > b.name ? 1 : -1);
        // for (const item of all_items) {
        //   items_html += `<li><input type="checkbox" id="character-${this.actor.id}-itemadd-${item.id}"><label for="character-${this.actor.id}-itemadd-${item.id}">${item.name}</label></li>`;
        // }
        // items_html += '</ul';
        // let d = new Dialog({
        //   title: "Add New Item",
        //   content:  `<h3>Select items to add:</h3>
        //             ${items_html}
        //             `,
        //   buttons: {
        //     one: {
        //       icon: "<i class='fas fa-check'></i>",
        //       label: "One",
        //       callback: ()=> console.log("One")
        //     }
        //   },
        //   render: (html) => {
        //
        //   },
        //   close: (html) => {
        //
        //   }
        // });
        // d.render(true);
      }
    }
  ];

  abilityContextMenu = [
    {
      name: game.i18n.localize("BITD.DeleteAbility"),
      icon: '<i class="fas fa-trash"></i>',
      callback: element => {
        console.log(this.actor.items);
        this.actor.deleteEmbeddedDocuments("Item", [element.data("ability-id")]);
      }
    }
  ]

  abilityListContextMenu = [
    {
      name: game.i18n.localize("BITD.AddAbility"),
      icon: '<i class="fas fa-plus"></i>',
      callback: element => {
        let d = new Dialog({
          title: "Add Item",
          content: "Pick an ability to add",
          buttons: {
            one: {
              icon: "<i class='fas fa-check'></i>",
              label: "One",
              callback: ()=> console.log("One")
            }
          },
          render: (html) => {

          },
          close: (html) => {

          }
        });
        d.render(true);

      }
    }
  ]

  async addNewItem(){
      let playbooks_index = await game.packs.get("blades-in-the-dark.class").getIndex();
      let playbook_name = playbooks_index.find(pb => pb._id == this.actor.data.data.playbook).name;
      let item_data_model = game.system.model.Item.item;
      let new_item_data = { name : "New Item", type : "item", data : {...item_data_model} };
      new_item_data.data.class = playbook_name;
      new_item_data.data.load = 1;

      let new_item = await this.actor.createEmbeddedDocuments("Item", [new_item_data], {renderSheet : true});
      return new_item;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    var data = super.getData();
    data.editable = this.options.editable;
    data.isGM = game.user.isGM;
    const actorData = data.data;
    data.actor = actorData;
    data.data = actorData.data;

    // Prepare active effects
    data.effects = prepareActiveEffectCategories(this.actor.effects);

    // Calculate Load
    let loadout = 0;
    data.items.forEach(i => {loadout += (i.type === "item") ? parseInt(i.data.load) : 0});
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
      if (i.type == "ability" && i.name == "(C) Mule") {
        mule_present = 1;
      }
    });

    //set encumbrance level
    if (mule_present) {
      data.data.load_level=mule_level[loadout];
    } else {
      data.data.load_level=load_level[loadout];
    }

    data.load_levels = {"BITD.Light":"BITD.Light", "BITD.Normal":"BITD.Normal", "BITD.Heavy":"BITD.Heavy"};

    //load up playbook options/data for playbook select
    data.playbook_options = await game.packs.get("blades-in-the-dark.class").getIndex();
    data.playbook_select = this.prepIndexForHelper(data.playbook_options);

    if(data.data.playbook != ""){
      data.selected_playbook_full = await game.packs.get("blades-in-the-dark.class").getDocument(data.data.playbook);
      data.selected_playbook_name = data.selected_playbook_full.name;
      data.selected_playbook_description = data.selected_playbook_full.data.data.description;

      let playbook_abilities = data.items.filter(item => item.type == "ability" );

      //hide the playbook abbreviations for display
      data.playbook_abilities = playbook_abilities.map(item => {
        item.name = item.name.replace(/\([^)]*\)\s/, "");
        return item;
      });

      // let playbook_items = data.items.filter(item => item.type == "item" && item.data.class == data.selected_playbook_name);
      let my_items = data.items.filter(item => item.type == "item" && item.data.class != "");

      //hide the playbook abbreviations for display
      data.my_items = my_items.map(item => {
        item.name = item.name.replace(/\([^)]*\)\s/, "")
        return item;
      });
      data.generic_items = data.items.filter(item => item.type == "item" && item.data.class == "");
    }

    //testing trauma
    // data.data.trauma.list = ["Cold", "Haunted"];

    return data;
  }

  prepIndexForHelper(index){
    let prepped = {};
    index.forEach(item => prepped[item._id] = item.name);
    return prepped;
  }

  addTermTooltips(html){
    html.find('.hover-term').hover(function(e){ // Hover event
      var titleText = BladesLookup.getTerm($(this).text());
      $(this).data('tiptext', titleText).removeAttr('title');
      $('<p class="tooltip"></p>').text(titleText).appendTo('body').css('top', (e.pageY - 10) + 'px').css('left', (e.pageX + 20) + 'px').fadeIn('fast');
    }, function(){ // Hover off event
      $(this).attr('title', $(this).data('tiptext'));
      $('.tooltip').remove();
    }).mousemove(function(e){ // Mouse move event
      $('.tooltip').css('top', (e.pageY - 10) + 'px').css('left', (e.pageX + 20) + 'px');
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
    new ContextMenu(html, ".context-items", this.itemListContextMenu);
    new ContextMenu(html, ".context-abilities", this.abilityListContextMenu);

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
    // html.find('.item-delete').click( async ev => {
    //   const element = $(ev.currentTarget).parents(".item");
    //   await this.actor.deleteEmbeddedDocuments("Item", [element.data("itemId")]);
    //   element.slideUp(200, () => this.render(false));
    // });

    html.find('.toggle-allow-edit span').click(async (event) => {
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
      let clickedAcqIdx = acquaintances.findIndex(item => item._id == acqId);
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

    html.find('.add-playbook-item').click(async ev => {

    });


    // manage active effects
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));
  }

  /* -------------------------------------------- */

}

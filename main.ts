import {Plugin} from "obsidian";
import {GraphLeaf} from "types";

export default class GraphNestedTagsPlugin extends Plugin {

  aggregate_counter: any = {};

  inject_setData(graphLeaf: GraphLeaf) {
    const r = graphLeaf.view.renderer;

    if (!r._setData) {
      r._setData = r.setData;
    }
    r.setData = (data: any) => {
      const nodes = data.nodes;
      let parent: string;
      let last_tag: string;

      for (const id in nodes) {
        if (nodes[id].type === "tag") {
          last_tag = id;
          for (let i = id.length - 1; i > 2; i--) {
            if (id[i] === "/") {
              parent = id.slice(0, i);
              if (!(parent in nodes)) {
                nodes[parent] = {type : "tag", links : {}, children : []};
                data.numLinks++;
              }
              if (!nodes[last_tag].links)
                nodes[last_tag].links = {};
              nodes[last_tag].links[parent] = true;
              if (!nodes[parent].children)
                nodes[parent].children = [];
              if (!nodes[parent].children.includes(last_tag)) {
                nodes[parent].children.push(last_tag);
              }
              data.numLinks++;
              last_tag = parent;
            }
          }
        }
      }

      for (const id in nodes) {
        const node = nodes[id];
        if (node.type !== "tag") {
          const links = Object.keys(node.links || {});
          links.forEach(link => {
            const tagNode = nodes[link];
            if (tagNode && tagNode.type === "tag") {
              tagNode.count = (tagNode.count || 0) + 1;
            }
          });
        }
      }

      const tags = Object.keys(nodes).filter(id => nodes[id].type === "tag");
      tags.forEach(id => { nodes[id].depth = (id.match(/\//g) || []).length; });
      tags.sort((a, b) => nodes[b].depth - nodes[a].depth);

      tags.forEach(id => {
        const node = nodes[id];
        node.aggregated = node.count || 0;
        node.children?.forEach((childId: string) => {
          node.aggregated += nodes[childId].aggregated || 0;
        });
        this.aggregate_counter[id] = node.aggregated
      });

      return r._setData?.(data);
    };
    return graphLeaf;
  }

  async onload() {
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      for (const leaf of this.app.workspace.getLeavesOfType("graph")) {
        if ((leaf as GraphLeaf).view.renderer._setData === undefined) {
          this.inject_setData(leaf as GraphLeaf);
        }

        const gl = leaf as GraphLeaf;

        if (gl.view.renderer.intervalId) {
          clearInterval(gl.view.renderer.intervalId);
        }

        gl.view.renderer.intervalId = setInterval(() => {
          if (!gl?.view?.renderer)
            return;
          gl.view.renderer.nodes.forEach((node: any) => {
            if (node.type === 'tag') {
              node.weight = this.aggregate_counter[node.id] + 8;
            }
          });
        }, 1);
      }
    }));
    this.app.workspace.trigger("layout-change");
    for (const leaf of this.app.workspace.getLeavesOfType("graph")) {
      if (leaf.view.renderer.intervalId) {
        clearInterval(leaf.view.renderer.intervalId);
        delete leaf.view.renderer.intervalId;
      }
      leaf.view.unload();
      leaf.view.load();
    }
  }

  onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType("graph") as
         GraphLeaf[]) {
      console.log("unload")
      console.log(leaf.view.renderer.intervalId)
      if (leaf.view.renderer.intervalId) {
        clearInterval(leaf.view.renderer.intervalId);
        delete leaf.view.renderer.intervalId;
      }
      if (leaf.view.renderer._setData) {
        leaf.view.renderer.setData = leaf.view.renderer._setData;
        delete leaf.view.renderer._setData;
        leaf.view.unload();
        leaf.view.load();
      }
    }
  }

  async loadSettings() {}

  async saveSettings() {}
}

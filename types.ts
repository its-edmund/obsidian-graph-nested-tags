/* eslint-disable @typescript-eslint/ban-types */
import { WorkspaceLeaf } from "obsidian";

export interface ObsidianNode {
	id: string;
	weight: number;
	aggregated: number;
}

export interface CustomLeaf {
	view: {
		renderer: {
			setData: Function;
			_setData?: Function;
			nodes: ObsidianNode[];
			intervalId: string;
		};
	};
}

export type GraphLeaf = WorkspaceLeaf & CustomLeaf;

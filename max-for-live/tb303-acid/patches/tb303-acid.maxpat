{
	"patcher": {
		"fileversion": 1,
		"appversion": {
			"major": 8,
			"minor": 6,
			"revision": 2,
			"architecture": "x64",
			"modernui": 1
		},
		"classnamespace": "box",
		"rect": [ 34.0, 89.0, 1180.0, 720.0 ],
		"bglocked": 0,
		"openinpresentation": 1,
		"default_fontsize": 12.0,
		"default_fontname": "Arial",
		"gridsize": [ 15.0, 15.0 ],
		"boxes": [
			{
				"box": {
					"id": "obj-title",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [ 30.0, 20.0, 220.0, 20.0 ],
					"presentation": 1,
					"presentation_rect": [ 12.0, 8.0, 220.0, 20.0 ],
					"text": "TB-303 Acid Machine (M4L)"
				}
			},
			{
				"box": {
					"id": "obj-device",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [ "bang", "int", "int" ],
					"patching_rect": [ 30.0, 55.0, 90.0, 22.0 ],
					"text": "live.thisdevice"
				}
			},
			{
				"box": {
					"id": "obj-midi-in",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "int" ],
					"patching_rect": [ 30.0, 95.0, 35.0, 22.0 ],
					"text": "in 1"
				}
			},
			{
				"box": {
					"id": "obj-midiparse",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 7,
					"outlettype": [ "", "", "", "int", "int", "", "" ],
					"patching_rect": [ 30.0, 130.0, 120.0, 22.0 ],
					"text": "midiparse"
				}
			},
			{
				"box": {
					"id": "obj-makenote",
					"maxclass": "newobj",
					"numinlets": 3,
					"numoutlets": 2,
					"outlettype": [ "float", "float" ],
					"patching_rect": [ 30.0, 170.0, 90.0, 22.0 ],
					"text": "makenote 100 80"
				}
			},
			{
				"box": {
					"id": "obj-midi-freq",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "float" ],
					"patching_rect": [ 30.0, 210.0, 40.0, 22.0 ],
					"text": "mtof"
				}
			},
			{
				"box": {
					"id": "obj-midi-gate",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "signal" ],
					"patching_rect": [ 90.0, 210.0, 45.0, 22.0 ],
					"text": "sig~"
				}
			},
			{
				"box": {
					"id": "obj-mode-tab",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 4,
					"outlettype": [ "", "", "", "float" ],
					"parameter_enable": 1,
					"patching_rect": [ 210.0, 95.0, 120.0, 22.0 ],
					"presentation": 1,
					"presentation_rect": [ 12.0, 36.0, 120.0, 18.0 ],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_enum": [ "MIDI", "Sequencer" ],
							"parameter_initial": [ 1 ],
							"parameter_longname": "Mode",
							"parameter_mmax": 1,
							"parameter_shortname": "Mode",
							"parameter_type": 2
						}
					},
					"text": "live.tab Mode"
				}
			},
			{
				"box": {
					"id": "obj-step",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 5,
					"outlettype": [ "", "float", "float", "float", "list" ],
					"parameter_enable": 1,
					"patching_rect": [ 210.0, 170.0, 180.0, 22.0 ],
					"presentation": 1,
					"presentation_rect": [ 12.0, 64.0, 360.0, 96.0 ],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_initial": [ 0 ],
							"parameter_longname": "Pattern",
							"parameter_shortname": "Pattern",
							"parameter_type": 4
						}
					},
					"text": "live.step @followglobaltransport 1 @sequence 16"
				}
			},
			{
				"box": {
					"id": "obj-step-note",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "float" ],
					"patching_rect": [ 210.0, 220.0, 70.0, 22.0 ],
					"text": "unpack f f f"
				}
			},
			{
				"box": {
					"id": "obj-root",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [ "", "", "float" ],
					"parameter_enable": 1,
					"patching_rect": [ 360.0, 220.0, 90.0, 22.0 ],
					"presentation": 1,
					"presentation_rect": [ 380.0, 64.0, 60.0, 18.0 ],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_initial": [ 36 ],
							"parameter_longname": "Root",
							"parameter_mmax": 48,
							"parameter_mmin": 24,
							"parameter_shortname": "Root",
							"parameter_type": 1,
							"parameter_unitstyle": 0
						}
					},
					"text": "live.dial @parameter_mmin 24 @parameter_mmax 48 @unitstyle int"
				}
			},
			{
				"box": {
					"id": "obj-seq-note",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [ "float" ],
					"patching_rect": [ 280.0, 260.0, 40.0, 22.0 ],
					"text": "+ 0"
				}
			},
			{
				"box": {
					"id": "obj-seq-freq",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "float" ],
					"patching_rect": [ 280.0, 300.0, 40.0, 22.0 ],
					"text": "mtof"
				}
			},
			{
				"box": {
					"id": "obj-seq-gate",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "signal" ],
					"patching_rect": [ 340.0, 300.0, 45.0, 22.0 ],
					"text": "sig~ 1"
				}
			},
			{
				"box": {
					"id": "obj-seq-accent",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "signal" ],
					"patching_rect": [ 400.0, 300.0, 45.0, 22.0 ],
					"text": "sig~ 0"
				}
			},
			{
				"box": {
					"id": "obj-switch-freq",
					"maxclass": "newobj",
					"numinlets": 3,
					"numoutlets": 1,
					"outlettype": [ "signal" ],
					"patching_rect": [ 150.0, 350.0, 55.0, 22.0 ],
					"text": "switch~ 2"
				}
			},
			{
				"box": {
					"id": "obj-switch-gate",
					"maxclass": "newobj",
					"numinlets": 3,
					"numoutlets": 1,
					"outlettype": [ "signal" ],
					"patching_rect": [ 220.0, 350.0, 55.0, 22.0 ],
					"text": "switch~ 2"
				}
			},
			{
				"box": {
					"id": "obj-switch-accent",
					"maxclass": "newobj",
					"numinlets": 3,
					"numoutlets": 1,
					"outlettype": [ "signal" ],
					"patching_rect": [ 290.0, 350.0, 55.0, 22.0 ],
					"text": "switch~ 2"
				}
			},
			{
				"box": {
					"id": "obj-midi-freq-sig",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "signal" ],
					"patching_rect": [ 30.0, 350.0, 45.0, 22.0 ],
					"text": "sig~"
				}
			},
			{
				"box": {
					"id": "obj-midi-accent-sig",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "signal" ],
					"patching_rect": [ 90.0, 350.0, 45.0, 22.0 ],
					"text": "sig~ 0"
				}
			},
			{
				"box": {
					"id": "obj-wave-sig",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "signal" ],
					"patching_rect": [ 520.0, 350.0, 45.0, 22.0 ],
					"text": "sig~"
				}
			},
			{
				"box": {
					"id": "obj-wave",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [ "", "", "float" ],
					"parameter_enable": 1,
					"patching_rect": [ 520.0, 300.0, 120.0, 22.0 ],
					"presentation": 1,
					"presentation_rect": [ 452.0, 64.0, 90.0, 18.0 ],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_enum": [ "Saw", "Square" ],
							"parameter_initial": [ 0 ],
							"parameter_longname": "Wave",
							"parameter_mmax": 1,
							"parameter_shortname": "Wave",
							"parameter_type": 2
						}
					},
					"text": "live.menu @enum Saw Square"
				}
			},
			{
				"box": {
					"id": "obj-cutoff",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [ "", "", "float" ],
					"parameter_enable": 1,
					"patching_rect": [ 600.0, 170.0, 90.0, 22.0 ],
					"presentation": 1,
					"presentation_rect": [ 12.0, 176.0, 44.0, 44.0 ],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_initial": [ 0.55 ],
							"parameter_longname": "Cutoff",
							"parameter_mmax": 1.0,
							"parameter_mmin": 0.0,
							"parameter_shortname": "Cutoff",
							"parameter_type": 0
						}
					},
					"text": "live.dial @parameter_mmin 0 @parameter_mmax 1"
				}
			},
			{
				"box": {
					"id": "obj-res",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [ "", "", "float" ],
					"parameter_enable": 1,
					"patching_rect": [ 700.0, 170.0, 90.0, 22.0 ],
					"presentation": 1,
					"presentation_rect": [ 64.0, 176.0, 44.0, 44.0 ],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_initial": [ 0.62 ],
							"parameter_longname": "Resonance",
							"parameter_mmax": 1.0,
							"parameter_mmin": 0.0,
							"parameter_shortname": "Res",
							"parameter_type": 0
						}
					},
					"text": "live.dial @parameter_mmin 0 @parameter_mmax 1"
				}
			},
			{
				"box": {
					"id": "obj-envmod",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [ "", "", "float" ],
					"parameter_enable": 1,
					"patching_rect": [ 800.0, 170.0, 90.0, 22.0 ],
					"presentation": 1,
					"presentation_rect": [ 116.0, 176.0, 44.0, 44.0 ],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_initial": [ 0.75 ],
							"parameter_longname": "EnvMod",
							"parameter_mmax": 1.0,
							"parameter_mmin": 0.0,
							"parameter_shortname": "Env",
							"parameter_type": 0
						}
					},
					"text": "live.dial @parameter_mmin 0 @parameter_mmax 1"
				}
			},
			{
				"box": {
					"id": "obj-decay",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [ "", "", "float" ],
					"parameter_enable": 1,
					"patching_rect": [ 900.0, 170.0, 90.0, 22.0 ],
					"presentation": 1,
					"presentation_rect": [ 168.0, 176.0, 44.0, 44.0 ],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_initial": [ 0.45 ],
							"parameter_longname": "Decay",
							"parameter_mmax": 1.0,
							"parameter_mmin": 0.0,
							"parameter_shortname": "Decay",
							"parameter_type": 0
						}
					},
					"text": "live.dial @parameter_mmin 0 @parameter_mmax 1"
				}
			},
			{
				"box": {
					"id": "obj-slide",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [ "", "", "float" ],
					"parameter_enable": 1,
					"patching_rect": [ 600.0, 230.0, 90.0, 22.0 ],
					"presentation": 1,
					"presentation_rect": [ 220.0, 176.0, 44.0, 44.0 ],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_initial": [ 0.055 ],
							"parameter_longname": "Slide",
							"parameter_mmax": 0.35,
							"parameter_mmin": 0.005,
							"parameter_shortname": "Slide",
							"parameter_type": 0
						}
					},
					"text": "live.dial @parameter_mmin 0.005 @parameter_mmax 0.35"
				}
			},
			{
				"box": {
					"id": "obj-drive",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [ "", "", "float" ],
					"parameter_enable": 1,
					"patching_rect": [ 700.0, 230.0, 90.0, 22.0 ],
					"presentation": 1,
					"presentation_rect": [ 272.0, 176.0, 44.0, 44.0 ],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_initial": [ 1.35 ],
							"parameter_longname": "Drive",
							"parameter_mmax": 2.5,
							"parameter_mmin": 0.8,
							"parameter_shortname": "Drive",
							"parameter_type": 0
						}
					},
					"text": "live.dial @parameter_mmin 0.8 @parameter_mmax 2.5"
				}
			},
			{
				"box": {
					"id": "obj-tune",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [ "", "", "float" ],
					"parameter_enable": 1,
					"patching_rect": [ 800.0, 230.0, 90.0, 22.0 ],
					"presentation": 1,
					"presentation_rect": [ 324.0, 176.0, 44.0, 44.0 ],
					"saved_attribute_attributes": {
						"valueof": {
							"parameter_initial": [ 0 ],
							"parameter_longname": "Tune",
							"parameter_mmax": 12,
							"parameter_mmin": -12,
							"parameter_shortname": "Tune",
							"parameter_type": 0
						}
					},
					"text": "live.dial @parameter_mmin -12 @parameter_mmax 12"
				}
			},
			{
				"box": {
					"id": "obj-param-cutoff",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [ "" ],
					"patching_rect": [ 600.0, 280.0, 90.0, 22.0 ],
					"text": "prepend cutoff"
				}
			},
			{
				"box": {
					"id": "obj-param-res",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [ "" ],
					"patching_rect": [ 700.0, 280.0, 100.0, 22.0 ],
					"text": "prepend resonance"
				}
			},
			{
				"box": {
					"id": "obj-param-env",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [ "" ],
					"patching_rect": [ 800.0, 280.0, 90.0, 22.0 ],
					"text": "prepend envmod"
				}
			},
			{
				"box": {
					"id": "obj-param-decay",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [ "" ],
					"patching_rect": [ 900.0, 280.0, 80.0, 22.0 ],
					"text": "prepend decay"
				}
			},
			{
				"box": {
					"id": "obj-param-slide",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [ "" ],
					"patching_rect": [ 600.0, 320.0, 80.0, 22.0 ],
					"text": "prepend slide"
				}
			},
			{
				"box": {
					"id": "obj-param-drive",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [ "" ],
					"patching_rect": [ 700.0, 320.0, 80.0, 22.0 ],
					"text": "prepend drive"
				}
			},
			{
				"box": {
					"id": "obj-param-tune",
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [ "" ],
					"patching_rect": [ 800.0, 320.0, 80.0, 22.0 ],
					"text": "prepend tune"
				}
			},
			{
				"box": {
					"id": "obj-params",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "" ],
					"patching_rect": [ 750.0, 360.0, 55.0, 22.0 ],
					"text": "t b"
				}
			},
			{
				"box": {
					"id": "obj-gen",
					"maxclass": "newobj",
					"numinlets": 5,
					"numoutlets": 2,
					"outlettype": [ "signal", "signal" ],
					"patching_rect": [ 360.0, 420.0, 160.0, 22.0 ],
					"text": "gen~ @gen tb303_voice"
				}
			},
			{
				"box": {
					"id": "obj-dcblock",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "signal" ],
					"patching_rect": [ 360.0, 470.0, 70.0, 22.0 ],
					"text": "dcblock~"
				}
			},
			{
				"box": {
					"id": "obj-lim",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [ "signal" ],
					"patching_rect": [ 360.0, 510.0, 90.0, 22.0 ],
					"text": "limi~ 1 0.95"
				}
			},
			{
				"box": {
					"id": "obj-out-l",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [ 360.0, 560.0, 45.0, 22.0 ],
					"text": "out~ 1"
				}
			},
			{
				"box": {
					"id": "obj-out-r",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [ 420.0, 560.0, 45.0, 22.0 ],
					"text": "out~ 2"
				}
			},
			{
				"box": {
					"id": "obj-comment-setup",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [ 600.0, 420.0, 420.0, 60.0 ],
					"text": "First open: double-click gen~, create Codebox, paste gen/tb303_voice.genexpr, save as tb303_voice.gendsp in this folder, add gen folder to Max File Preferences."
				}
			}
		],
		"lines": [
			{
				"patchline": {
					"destination": [ "obj-midiparse", 0 ],
					"source": [ "obj-midi-in", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-makenote", 0 ],
					"source": [ "obj-midiparse", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-makenote", 1 ],
					"source": [ "obj-midiparse", 1 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-midi-freq", 0 ],
					"source": [ "obj-makenote", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-midi-gate", 0 ],
					"source": [ "obj-makenote", 1 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-midi-freq-sig", 0 ],
					"source": [ "obj-midi-freq", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-switch-freq", 1 ],
					"source": [ "obj-midi-freq-sig", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-switch-gate", 1 ],
					"source": [ "obj-midi-gate", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-switch-accent", 1 ],
					"source": [ "obj-midi-accent-sig", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-switch-freq", 0 ],
					"source": [ "obj-seq-freq", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-switch-gate", 0 ],
					"source": [ "obj-seq-gate", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-switch-accent", 0 ],
					"source": [ "obj-seq-accent", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-switch-freq", 2 ],
					"source": [ "obj-mode-tab", 3 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-switch-gate", 2 ],
					"source": [ "obj-mode-tab", 3 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-switch-accent", 2 ],
					"source": [ "obj-mode-tab", 3 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-gen", 0 ],
					"source": [ "obj-switch-freq", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-gen", 1 ],
					"source": [ "obj-switch-gate", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-gen", 2 ],
					"source": [ "obj-switch-accent", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-wave-sig", 0 ],
					"source": [ "obj-wave", 2 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-gen", 3 ],
					"source": [ "obj-wave-sig", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-param-cutoff", 0 ],
					"source": [ "obj-cutoff", 2 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-param-res", 0 ],
					"source": [ "obj-res", 2 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-param-env", 0 ],
					"source": [ "obj-envmod", 2 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-param-decay", 0 ],
					"source": [ "obj-decay", 2 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-param-slide", 0 ],
					"source": [ "obj-slide", 2 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-param-drive", 0 ],
					"source": [ "obj-drive", 2 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-param-tune", 0 ],
					"source": [ "obj-tune", 2 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-gen", 4 ],
					"source": [ "obj-param-cutoff", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-gen", 4 ],
					"source": [ "obj-param-res", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-gen", 4 ],
					"source": [ "obj-param-env", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-gen", 4 ],
					"source": [ "obj-param-decay", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-gen", 4 ],
					"source": [ "obj-param-slide", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-gen", 4 ],
					"source": [ "obj-param-drive", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-gen", 4 ],
					"source": [ "obj-param-tune", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-dcblock", 0 ],
					"source": [ "obj-gen", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-lim", 0 ],
					"source": [ "obj-dcblock", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-out-l", 0 ],
					"source": [ "obj-lim", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-out-r", 0 ],
					"source": [ "obj-lim", 0 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-seq-note", 0 ],
					"source": [ "obj-root", 2 ]
				}
			},
			{
				"patchline": {
					"destination": [ "obj-seq-freq", 0 ],
					"source": [ "obj-seq-note", 0 ]
				}
			}
		]
	}
}

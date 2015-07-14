// Controller Script for the Arturia Beatstep

loadAPI(1);

load("Extensions.js");

host.defineController("Arturia", "BeatStep (dln)", "1.0", "4db7d4cc-9023-4fa0-9ecf-c2202d9d96dd", "Bitwig");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["Arturia BeatStep"], ["Arturia BeatStep"]);
host.addDeviceNameBasedDiscoveryPair(["Arturia BeatStep MIDI 1"], ["Arturia BeatStep MIDI 1"]);

var bst = null;

var LOWEST_CC = 1;
var HIGHEST_CC = 119;

function BeatStep() {
   this.midiPort = host.getMidiInPort(0).createNoteInput("KeyLab", "?0????");
   this.midiPort.setShouldConsumeEvents(false);
   this.midiPort.assignPolyphonicAftertouchToExpression(0, NoteExpression.TIMBRE_UP, 2);

   host.getMidiOutPort(0).setShouldSendMidiBeatClock(true);
   host.getMidiInPort(0).setMidiCallback(onMidi);
   host.getMidiInPort(0).setSysexCallback(onSysex);

   // create views:
   this.transport = host.createTransport();
   this.bTrack = host.createMainTrackBank(8, 2, 8);
   this.cTrack = host.createCursorTrack(2, 0);
   this.cDevice = host.createEditorCursorDevice();
   this.cTrackSection = host.createCursorTrackSection(3, 0);
   this.primaryInstrument = cTrack.getPrimaryInstrument();

   for ( var p = 0; p < 8; p++) {
		var macro = this.primaryInstrument.getMacro(p).getAmount();
		var parameter = this.cDevice.getParameter(p);
		macro.setIndication(true);
		parameter.setIndication(true);
		parameter.setLabel("P" + (p + 1));
	}
	
   // notification settings:
   this.notification = host.getNotificationSettings();
   this.notification.setShouldShowChannelSelectionNotifications(true);
   this.notification.setShouldShowDeviceLayerSelectionNotifications(true);
   this.notification.setShouldShowDeviceSelectionNotifications(true);
   this.notification.setShouldShowMappingNotifications(true);
   this.notification.setShouldShowPresetNotifications(true);
   this.notification.setShouldShowSelectionNotifications(true);
   this.notification.setShouldShowTrackSelectionNotifications(true);
   this.notification.setShouldShowValueNotifications(true);
  
   // create preferences:
   this.prefs = host.getPreferences();
   this.doc = host.getDocumentState();
   this.resetNoteNumber = 36;

   // setup preferences:
   this.resetNotes = this.doc.getSignalSetting("Reset all Notes", "Reset Sequence Notes", "Reset");
   this.resetNotes.addSignalObserver(function() {
      for (var i = 0; i < 16; i++) {
         beatStepSetNote(i, this.resetNoteNumber);
      }
   });
   this.resetToNote = this.doc.getNumberSetting("Note Number", "Reset Sequence Notes", 0, 127, 1, "", 36);
   this.resetToNote.addValueObserver(127, function(value) {
      this.resetNoteNumber = value;
   });

   //States:
   this.isPlaying = false;

   this.knobBank1 = [
     10, 74, 71, 76,
     114, 18, 19, 16,
   ];
   this.knobBank2 = [
	 77, 93, 73, 75,
	 17,  91, 79, 72,
   ];
   this.knobVolume = 7;
   this.noteBank1 = [44, 45, 46, 47, 48, 49, 50, 51];
   this.noteBank2 = [36, 37, 38, 39, 40, 41, 42, 43];

   this.transport.addIsPlayingObserver(function (on) {
      this.isPlaying = on;
   })

   // set indications:
   for (var i = 0; i < 8; i++) {
      this.bTrack.getChannel(i).getVolume().setIndication(true);
   }


   // return the this object:
   return this;
}

function init()
{
   //create the main BeatStep instance:
   bst = BeatStep();

   // Make CCs 2-119 freely mappable
   userControls = host.createUserControlsSection(HIGHEST_CC - LOWEST_CC + 1);

   for(var i=LOWEST_CC; i<=HIGHEST_CC; i++)
   {
      userControls.getControl(i - LOWEST_CC).setLabel("CC" + i);
   }
}



function onMidi(status, data1, data2)
{
   printMidi(status, data1, data2);

   var midi = new MidiData(status, data1, data2);

   println(midi.channel());
   println(midi.type());

   switch (midi.type()) {
      case "CC":
         var inc = midi.data2 - 64;

         switch(midi.channel()) {
            case 0:
			   for (var i = 0; i < 8; i++) {
                  if (midi.data1 === bst.knobBank1[i]) {
					 bst.primaryInstrument.getMacro(i).getAmount().inc(inc, 128);
                     return;
                  }
                  if (midi.data1 === bst.knobBank2[i]) {
				     this.cDevice.getParameter(i).inc(inc, 128);
                     return;
                  }
               }
               break;
            case 1:
               if (midi.data1 === bst.knobVolume) {
                  inc < 0 ? bst.bTrack.scrollChannelsUp() : bst.bTrack.scrollChannelsDown();
                  return;
               }
               for (var i = 0; i < 8; i++) {
                  if (midi.data1 === bst.knobBank1[i]) {
                     bst.bTrack.getChannel(i).getVolume().inc(inc, 128);
                     return;
                  }
                  else if (midi.data1 === bst.knobBank2[i]) {
                     bst.bTrack.getChannel(i).getPan().inc(inc, 127);
                     return;
                  }
               }
               break;
            case 2:
               if (midi.data1 === bst.knobVolume) {
                  inc < 0 ? bst.bTrack.scrollChannelsUp() : bst.bTrack.scrollChannelsDown();
                  return;
               }
               for (var i = 0; i < 8; i++) {
                  if (midi.data1 === bst.knobBank1[i]) {
                     bst.bTrack.getChannel(i).getSend(0).inc(inc, 128);
                     return;
                  }
                  else if (midi.data1 === bst.knobBank2[i]) {
                     bst.bTrack.getChannel(i).getSend(1).inc(inc, 127);
                     return;
                  }
               }
               break;
            case 3:
               if (midi.data1 === bst.knobVolume) {
                  inc < 0 ? bst.cTrack.selectPrevious() : bst.cTrack.selectNext();
                  return;
               }
               break;
            case 4:
               break;
            case 5:
               break;
            case 6:
               break;
            case 7:
               break;
            case 8:
               break;
            case 9:
               break;
            case 10:
               break;
            case 11:
               break;
            case 12:
               break;
            case 13:
               break;
            case 14:
               break;
            case 15:
               break;
         }
         break;
      case "NoteOn":
         switch(midi.channel()) {
            case 0:
               if (!bst.isPlaying) {
                  host.showPopupNotification("Note: " + midi.noteOctave());
               }
               break;
            case 1:
               for (var i = 0; i < 8; i++) {
                  if (midi.data1 === bst.noteBank1[i]) {
                     bst.bTrack.getChannel(i).getArm().toggle();
                     return;
                  }
                  else if (midi.data1 === bst.noteBank2[i]) {
                     bst.bTrack.getChannel(i).getMute().toggle();
                     return;
                  }
               }
               break;
            case 2:
               for (var i = 0; i < 8; i++) {
                  if (midi.data1 === bst.noteBank1[i]) {
                     bst.bTrack.getChannel(i).getSolo().toggle();
                     return;
                  }
                  else if (midi.data1 === bst.noteBank2[i]) {
                     bst.bTrack.getChannel(i).getMonitor().toggle();
                     return;
                  }
               }
               break;
            case 3:
               break;
            case 4:
               break;
            case 5:
               break;
            case 6:
               break;
            case 7:
               break;
            case 8:
               break;
            case 9:
               break;
            case 10:
               break;
            case 11:
               break;
            case 12:
               break;
            case 13:
               break;
            case 14:
               break;
            case 15:
               break;
         }
      	break;      //case "NoteOff":
      //	 break;
      //case "KeyPressure":
      //	 break;
      //case "ProgramChange":
      //	 break;
      //case "ChannelPressure":
      //	 break;
      //case "PitchBend":
      //	 break;
      //case "Other":
      //	 break
   }






   if (isChannelController(status))
   {
      if (data1 >= LOWEST_CC && data1 <= HIGHEST_CC)
      {
         var index = data1 - LOWEST_CC;
         userControls.getControl(index).set(data2, 128);
      }
   }
}

function onSysex(data) {
   printSysex(data);
   println(data);
   switch (data) {
      case "f07f7f0601f7":
         bst.transport.stop();
         break;
      case "f07f7f0602f7":
         bst.transport.play();
         break;
   }

}

function beatStepSetNote(step, note) {
   //F0  00  20  6B  7F  42  02  00  52  step  note  F7
   sendSysex("F0 00 20 6B 7F 42 02 00 52 " + uint7ToHex(step) + uint7ToHex(note) + "F7");
}


function exit()
{

}

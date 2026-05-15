package com.flavos.healthy;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.flavos.healthy.plugins.HealthSyncPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registrar plugins nativos customizados
        registerPlugin(HealthSyncPlugin.class);

        super.onCreate(savedInstanceState);
    }
}

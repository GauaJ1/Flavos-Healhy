package com.flavos.healthy.plugins

import android.util.Log
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HydrationRecord
import androidx.health.connect.client.records.MealType
import androidx.health.connect.client.records.NutritionRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Mass
import androidx.health.connect.client.units.Volume
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.ZoneOffset

/**
 * Plugin Capacitor nativo para sincronização com Health Connect.
 *
 * Suporta escrita de:
 * - NutritionRecord (nutrição completa — calorias, macros, nome da refeição)
 * - HydrationRecord (ingestão de água)
 * - WeightRecord (peso corporal)
 *
 * Os dados escritos no Health Connect são sincronizados automaticamente
 * com o Samsung Health pelo sistema Android (bidirecional).
 */
@CapacitorPlugin(name = "HealthSync")
class HealthSyncPlugin : Plugin() {

    companion object {
        private const val TAG = "HealthSyncPlugin"

        // Mapeamento de tipo de refeição (JavaScript → Android)
        // Constantes definidas em androidx.health.connect.client.records.MealType
        private const val MEAL_TYPE_UNKNOWN = MealType.MEAL_TYPE_UNKNOWN
        private const val MEAL_TYPE_BREAKFAST = MealType.MEAL_TYPE_BREAKFAST
        private const val MEAL_TYPE_LUNCH = MealType.MEAL_TYPE_LUNCH
        private const val MEAL_TYPE_DINNER = MealType.MEAL_TYPE_DINNER
        private const val MEAL_TYPE_SNACK = MealType.MEAL_TYPE_SNACK
    }

    // Coroutine scope para operações IO do Health Connect
    private val scope = CoroutineScope(Dispatchers.IO)

    // ID do callback salvo para recuperação após retorno da tela de permissões
    private var pendingPermissionCallbackId: String? = null

    // Permission launcher — registrado em load() (durante onCreate, antes de STARTED)
    private lateinit var permissionLauncher: ActivityResultLauncher<Set<String>>

    // Conjunto de permissões que o app requer
    private val requiredPermissions = setOf(
        HealthPermission.getWritePermission(NutritionRecord::class),
        HealthPermission.getWritePermission(HydrationRecord::class),
        HealthPermission.getWritePermission(WeightRecord::class),
        HealthPermission.getReadPermission(NutritionRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
    )

    override fun load() {
        super.load()
        Log.i(TAG, "Inicializando HealthSyncPlugin...")

        try {
            // Registrar o launcher de permissões usando o contrato do PermissionController.
            // OBRIGATÓRIO: isso deve ser feito em load() (que roda durante onCreate),
            // ANTES da Activity atingir estado STARTED.
            val requestPermissionActivityContract =
                PermissionController.createRequestPermissionResultContract()

            permissionLauncher = bridge.activity.registerForActivityResult(
                requestPermissionActivityContract
            ) { granted ->
                Log.i(TAG, "Permissões retornadas: ${granted.size} concedidas")
                handlePermissionResult(granted)
            }

            Log.i(TAG, "HealthSyncPlugin inicializado com sucesso")
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao registrar permission launcher", e)
        }
    }

    /**
     * Processa o resultado da solicitação de permissões.
     * Chamado pelo callback do ActivityResultLauncher na Main thread.
     */
    private fun handlePermissionResult(granted: Set<String>) {
        // Recuperar a PluginCall salva pelo Capacitor usando o callbackId
        val callbackId = pendingPermissionCallbackId ?: return
        val savedCall = bridge.getSavedCall(callbackId)

        if (savedCall == null) {
            Log.w(TAG, "Nenhuma PluginCall salva encontrada para permissões")
            return
        }

        try {
            val allGranted = requiredPermissions.all { it in granted }

            val result = JSObject()
            result.put("allGranted", allGranted)
            result.put("grantedCount", granted.size)
            result.put("requiredCount", requiredPermissions.size)

            Log.i(TAG, "Permissões processadas: allGranted=$allGranted, ${granted.size}/${requiredPermissions.size}")

            savedCall.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao processar resultado de permissões", e)
            savedCall.reject("Erro ao processar permissões: ${e.message}")
        } finally {
            bridge.releaseCall(savedCall)
            pendingPermissionCallbackId = null
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Verificação de disponibilidade
    // ──────────────────────────────────────────────────────────────

    @PluginMethod
    fun checkAvailability(call: PluginCall) {
        val ctx = context ?: run {
            call.reject("Contexto não disponível")
            return
        }

        try {
            val status = HealthConnectClient.getSdkStatus(ctx)
            val result = JSObject()
            result.put("available", status == HealthConnectClient.SDK_AVAILABLE)
            result.put("status", when (status) {
                HealthConnectClient.SDK_AVAILABLE -> "available"
                HealthConnectClient.SDK_UNAVAILABLE -> "unavailable"
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update_required"
                else -> "unknown"
            })

            Log.i(TAG, "SDK Status: ${result.getString("status")}")
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao verificar disponibilidade do Health Connect", e)
            call.reject("Erro ao verificar Health Connect: ${e.message}")
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Permissões
    // ──────────────────────────────────────────────────────────────

    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        val ctx = context ?: run {
            call.reject("Contexto não disponível")
            return
        }

        // Verificar se o Health Connect está disponível antes de tentar
        val sdkStatus = HealthConnectClient.getSdkStatus(ctx)
        if (sdkStatus != HealthConnectClient.SDK_AVAILABLE) {
            val result = JSObject()
            result.put("allGranted", false)
            result.put("grantedCount", 0)
            result.put("requiredCount", requiredPermissions.size)
            result.put("error", "Health Connect não disponível (status: $sdkStatus)")
            call.resolve(result)
            return
        }

        val client = HealthConnectClient.getOrCreate(ctx)

        scope.launch {
            try {
                // Primeiro verificar se já temos todas as permissões
                val alreadyGranted = client.permissionController.getGrantedPermissions()
                val allGranted = requiredPermissions.all { it in alreadyGranted }

                if (allGranted) {
                    Log.i(TAG, "Todas as permissões já concedidas")
                    val result = JSObject()
                    result.put("allGranted", true)
                    result.put("grantedCount", alreadyGranted.size)
                    result.put("requiredCount", requiredPermissions.size)
                    call.resolve(result)
                    return@launch
                }

                // Salvar a call usando o mecanismo do Capacitor (sobrevive a lifecycle)
                bridge.saveCall(call)
                pendingPermissionCallbackId = call.callbackId

                // CRÍTICO: Lançar o ActivityResultLauncher na Main thread
                // ActivityResultLauncher.launch() DEVE ser chamado na UI thread
                withContext(Dispatchers.Main) {
                    try {
                        Log.i(TAG, "Abrindo tela de permissões do Health Connect...")
                        permissionLauncher.launch(requiredPermissions)
                    } catch (e: Exception) {
                        Log.e(TAG, "Erro ao abrir tela de permissões", e)
                        pendingPermissionCallbackId?.let { cbId ->
                            val savedCall = bridge.getSavedCall(cbId)
                            savedCall?.reject("Erro ao abrir tela de permissões: ${e.message}")
                            if (savedCall != null) bridge.releaseCall(savedCall)
                        }
                        pendingPermissionCallbackId = null
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Erro ao verificar/solicitar permissões", e)
                call.reject("Erro ao verificar permissões: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun checkHealthPermissions(call: PluginCall) {
        val ctx = context ?: run {
            call.reject("Contexto não disponível")
            return
        }

        // Verificar disponibilidade primeiro
        val sdkStatus = HealthConnectClient.getSdkStatus(ctx)
        if (sdkStatus != HealthConnectClient.SDK_AVAILABLE) {
            val result = JSObject()
            result.put("nutritionWrite", false)
            result.put("hydrationWrite", false)
            result.put("weightWrite", false)
            result.put("nutritionRead", false)
            result.put("allGranted", false)
            call.resolve(result)
            return
        }

        val client = HealthConnectClient.getOrCreate(ctx)

        scope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()

                val hasNutritionWrite = HealthPermission.getWritePermission(NutritionRecord::class) in granted
                val hasHydrationWrite = HealthPermission.getWritePermission(HydrationRecord::class) in granted
                val hasWeightWrite = HealthPermission.getWritePermission(WeightRecord::class) in granted
                val hasNutritionRead = HealthPermission.getReadPermission(NutritionRecord::class) in granted

                val result = JSObject()
                result.put("nutritionWrite", hasNutritionWrite)
                result.put("hydrationWrite", hasHydrationWrite)
                result.put("weightWrite", hasWeightWrite)
                result.put("nutritionRead", hasNutritionRead)
                result.put("allGranted", hasNutritionWrite && hasHydrationWrite && hasWeightWrite)

                Log.d(TAG, "Permissões: nutrition=$hasNutritionWrite, hydration=$hasHydrationWrite, weight=$hasWeightWrite")
                call.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "Erro ao verificar permissões", e)
                call.reject("Erro ao verificar permissões: ${e.message}")
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Escrita de NutritionRecord
    // ──────────────────────────────────────────────────────────────

    @PluginMethod
    fun insertNutrition(call: PluginCall) {
        val ctx = context ?: run {
            call.reject("Contexto não disponível")
            return
        }

        val client = HealthConnectClient.getOrCreate(ctx)

        // Dados obrigatórios
        val calories = call.getDouble("calories") ?: run {
            call.reject("Campo 'calories' é obrigatório")
            return
        }

        // Dados opcionais
        val protein = call.getDouble("protein")
        val carbohydrates = call.getDouble("carbohydrates")
        val fat = call.getDouble("fat")
        val sugar = call.getDouble("sugar")
        val fiber = call.getDouble("fiber")
        val sodium = call.getDouble("sodium")
        val mealName = call.getString("mealName") ?: "Refeição"
        val mealType = call.getInt("mealType") ?: inferMealType()
        val clientRecordId = call.getString("clientRecordId") ?: "flavos_${System.currentTimeMillis()}"

        scope.launch {
            try {
                val now = Instant.now().minusSeconds(30)
                val zoneOffset = ZoneOffset.systemDefault().rules.getOffset(now)

                val nutritionRecord = NutritionRecord(
                    startTime = now,
                    endTime = now.plusSeconds(1),
                    startZoneOffset = zoneOffset,
                    endZoneOffset = zoneOffset,
                    energy = Energy.kilocalories(calories),
                    protein = protein?.let { Mass.grams(it) },
                    totalCarbohydrate = carbohydrates?.let { Mass.grams(it) },
                    totalFat = fat?.let { Mass.grams(it) },
                    sugar = sugar?.let { Mass.grams(it) },
                    dietaryFiber = fiber?.let { Mass.grams(it) },
                    sodium = sodium?.let { Mass.grams(it) },
                    mealType = mealType,
                    name = mealName,
                    metadata = Metadata.manualEntry(
                        clientRecordId = clientRecordId,
                    )
                )

                val insertResult = client.insertRecords(listOf(nutritionRecord))

                val response = JSObject()
                response.put("success", true)
                response.put("recordIds", insertResult.recordIdsList.joinToString(","))
                response.put("clientRecordId", clientRecordId)

                Log.i(TAG, "✅ NutritionRecord inserido: $mealName ($calories kcal)")
                call.resolve(response)
            } catch (ex: SecurityException) {
                Log.e(TAG, "❌ Sem permissão para escrever NutritionRecord", ex)
                call.reject("Sem permissão. Conceda acesso ao Health Connect.", "PERMISSION_DENIED")
            } catch (ex: Exception) {
                Log.e(TAG, "❌ Erro ao inserir NutritionRecord", ex)
                call.reject("Erro ao salvar dados nutricionais: ${ex.message}")
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Escrita de múltiplos NutritionRecord (refeição completa)
    // ──────────────────────────────────────────────────────────────

    @PluginMethod
    fun insertMeal(call: PluginCall) {
        val ctx = context ?: run {
            call.reject("Contexto não disponível")
            return
        }

        val client = HealthConnectClient.getOrCreate(ctx)

        val foodsArray = call.getArray("foods") ?: run {
            call.reject("Campo 'foods' é obrigatório (array de alimentos)")
            return
        }

        val mealType = call.getInt("mealType") ?: inferMealType()
        val entryId = call.getString("entryId") ?: "${System.currentTimeMillis()}"

        scope.launch {
            try {
                // Usar timestamps no passado para evitar
                // "Record start time must not be in the future"
                val totalFoods = foodsArray.length()
                val baseTime = Instant.now().minusSeconds((totalFoods + 1).toLong() * 60)
                val zoneOffset = ZoneOffset.systemDefault().rules.getOffset(baseTime)

                val records = mutableListOf<NutritionRecord>()

                for (i in 0 until totalFoods) {
                    val food = foodsArray.getJSONObject(i)

                    val record = NutritionRecord(
                        startTime = baseTime.plusSeconds(i.toLong() * 60),
                        endTime = baseTime.plusSeconds(i.toLong() * 60 + 30),
                        startZoneOffset = zoneOffset,
                        endZoneOffset = zoneOffset,
                        energy = Energy.kilocalories(food.optDouble("calories", 0.0)),
                        protein = food.optDouble("protein", -1.0).takeIf { it >= 0 }?.let { Mass.grams(it) },
                        totalCarbohydrate = food.optDouble("carbohydrates", -1.0).takeIf { it >= 0 }?.let { Mass.grams(it) },
                        totalFat = food.optDouble("fat", -1.0).takeIf { it >= 0 }?.let { Mass.grams(it) },
                        mealType = mealType,
                        name = food.optString("name", "Alimento"),
                        metadata = Metadata.manualEntry(
                            clientRecordId = "flavos_${entryId}_${i}",
                        )
                    )
                    records.add(record)
                }

                val insertResult = client.insertRecords(records)

                val response = JSObject()
                response.put("success", true)
                response.put("recordCount", records.size)
                response.put("recordIds", insertResult.recordIdsList.joinToString(","))

                Log.i(TAG, "✅ Refeição inserida: ${records.size} alimentos")
                call.resolve(response)
            } catch (ex: SecurityException) {
                Log.e(TAG, "❌ Sem permissão para escrever NutritionRecord", ex)
                call.reject("Sem permissão. Conceda acesso ao Health Connect.", "PERMISSION_DENIED")
            } catch (ex: Exception) {
                Log.e(TAG, "❌ Erro ao inserir refeição", ex)
                call.reject("Erro ao salvar refeição: ${ex.message}")
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Escrita de HydrationRecord
    // ──────────────────────────────────────────────────────────────

    @PluginMethod
    fun insertHydration(call: PluginCall) {
        val ctx = context ?: run {
            call.reject("Contexto não disponível")
            return
        }

        val client = HealthConnectClient.getOrCreate(ctx)

        val volumeMl = call.getDouble("volumeMl") ?: run {
            call.reject("Campo 'volumeMl' é obrigatório")
            return
        }

        scope.launch {
            try {
                val now = Instant.now().minusSeconds(30)
                val zoneOffset = ZoneOffset.systemDefault().rules.getOffset(now)

                val hydrationRecord = HydrationRecord(
                    startTime = now,
                    endTime = now.plusSeconds(1),
                    startZoneOffset = zoneOffset,
                    endZoneOffset = zoneOffset,
                    volume = Volume.milliliters(volumeMl),
                    metadata = Metadata.manualEntry(
                        clientRecordId = "flavos_water_${System.currentTimeMillis()}",
                    )
                )

                client.insertRecords(listOf(hydrationRecord))

                val response = JSObject()
                response.put("success", true)
                response.put("volumeMl", volumeMl)

                Log.i(TAG, "✅ HydrationRecord inserido: ${volumeMl}ml")
                call.resolve(response)
            } catch (e: SecurityException) {
                Log.e(TAG, "❌ Sem permissão para HydrationRecord", e)
                call.reject("Sem permissão. Conceda acesso ao Health Connect.", "PERMISSION_DENIED")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Erro ao inserir HydrationRecord", e)
                call.reject("Erro ao salvar hidratação: ${e.message}")
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Escrita de WeightRecord
    // ──────────────────────────────────────────────────────────────

    @PluginMethod
    fun insertWeight(call: PluginCall) {
        val ctx = context ?: run {
            call.reject("Contexto não disponível")
            return
        }

        val client = HealthConnectClient.getOrCreate(ctx)

        val weightKg = call.getDouble("weightKg") ?: run {
            call.reject("Campo 'weightKg' é obrigatório")
            return
        }

        scope.launch {
            try {
                val now = Instant.now().minusSeconds(30)
                val zoneOffset = ZoneOffset.systemDefault().rules.getOffset(now)

                val weightRecord = WeightRecord(
                    time = now,
                    zoneOffset = zoneOffset,
                    weight = Mass.kilograms(weightKg),
                    metadata = Metadata.manualEntry(
                        clientRecordId = "flavos_weight_${System.currentTimeMillis()}",
                    )
                )

                client.insertRecords(listOf(weightRecord))

                val response = JSObject()
                response.put("success", true)
                response.put("weightKg", weightKg)

                Log.i(TAG, "✅ WeightRecord inserido: ${weightKg}kg")
                call.resolve(response)
            } catch (e: SecurityException) {
                Log.e(TAG, "❌ Sem permissão para WeightRecord", e)
                call.reject("Sem permissão. Conceda acesso ao Health Connect.", "PERMISSION_DENIED")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Erro ao inserir WeightRecord", e)
                call.reject("Erro ao salvar peso: ${e.message}")
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Utilitários
    // ──────────────────────────────────────────────────────────────

    /**
     * Infere o tipo de refeição baseado no horário atual.
     * - 06:00–10:59 → Café da manhã
     * - 11:00–14:59 → Almoço
     * - 15:00–17:59 → Lanche
     * - 18:00–21:59 → Jantar
     * - 22:00–05:59 → Lanche
     */
    private fun inferMealType(): Int {
        val hour = java.time.LocalTime.now().hour
        return when (hour) {
            in 6..10 -> MEAL_TYPE_BREAKFAST
            in 11..14 -> MEAL_TYPE_LUNCH
            in 15..17 -> MEAL_TYPE_SNACK
            in 18..21 -> MEAL_TYPE_DINNER
            else -> MEAL_TYPE_SNACK
        }
    }
}

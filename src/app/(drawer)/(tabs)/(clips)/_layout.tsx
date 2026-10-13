import { StackScreen } from '@/constants/layout'
import { defaultStyles } from '@/styles'
import { Stack } from 'expo-router'
import { View } from 'react-native'

const ClipsScreenLayout = () => {
	return (
		<View style={defaultStyles.container}>
			<Stack>
				<Stack.Screen
					name="clips"
					options={{
						...StackScreen,
					}}
				/>
			</Stack>
		</View>
	)
}

export default ClipsScreenLayout

import torchvision.transforms as T
import torchvision.transforms.v2 as Tv2   # prefer v2 if your torchvision >= 0.13

def get_preprocessing_pipeline(train=False):
    if not train:
        # Keep simple & clean for val/test/live inference
        return T.Compose([
            T.Resize((224, 224), interpolation=T.InterpolationMode.BICUBIC),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    # Training: strong but safe for faces
    return T.Compose([
        # Crop + resize with mild zoom (helps pose/scale var)
        T.RandomResizedCrop(
            size=224,
            scale=(0.78, 1.0),       # allow more zoom-in than before
            ratio=(0.85, 1.15)
        ),
        T.RandomHorizontalFlip(p=0.5),

        # Geometric – conservative angles/shear for real head movements
        T.RandomAffine(
            degrees=(-25, 25),       # ↑ from 20 – side profiles help a lot
            translate=(0.10, 0.10),
            scale=(0.85, 1.20),
            shear=(-12, 12),
            interpolation=T.InterpolationMode.BICUBIC,
            fill=0
        ),

        # Color & lighting – crucial for robustness
        T.ColorJitter(
            brightness=0.6, contrast=0.6, saturation=0.5, hue=0.2
        ),
        T.RandomGrayscale(p=0.25),
        T.RandomAdjustSharpness(sharpness_factor=2.0, p=0.4),
        T.RandomPosterize(bits=7, p=0.25),          # compression artifacts
        T.RandomSolarize(threshold=160, p=0.2),     # overexposure simulation

        # Blur & noise – very useful for webcam/live quality
        T.RandomApply([T.GaussianBlur(kernel_size=(3,9), sigma=(0.5, 2.5))], p=0.35),

        # Occlusion simulation (very important for real-world faces)
        T.RandomErasing(
            p=0.45,
            scale=(0.03, 0.30),     # larger patches ok if face is still visible
            ratio=(0.3, 3.3),
            value='random'          # or 0 for black
        ),

        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])